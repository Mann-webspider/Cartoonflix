import fs from "node:fs";
import path from "node:path";
import pLimit from "p-limit";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { s3 } from "../lib/s3.js";

/**
 * How many files upload at once.
 *
 * Measured on this library's own segments rather than guessed, because the
 * intuition that more is faster is wrong here: 4 gave 2.82 MB/s, 8 gave 3.00,
 * and 16 collapsed to 1.66 with the median request rising from two seconds to
 * forty. The upstream link saturates around three megabytes a second and extra
 * connections past that point stop adding throughput and start dividing it.
 *
 * Six sits near the peak with room before the collapse, on the assumption that
 * a domestic connection has worse days than the one it was measured on.
 */
const DEFAULT_CONCURRENCY = 6;

/**
 * Multipart settings.
 *
 * Five megabytes is S3's minimum part size, so a ten-second 1080p segment —
 * about seven megabytes — becomes two parts and everything smaller stays a
 * single request. That is the point: this connection has been observed taking
 * sixty-six seconds over one segment, and a stall costs a part rather than the
 * whole file, retried on its own.
 *
 * Two parts in flight per file, against six files, keeps the number of open
 * connections in the range that measured fastest.
 */
const PART_SIZE = 5 * 1024 * 1024;
const PARTS_IN_FLIGHT = 2;

export const contentTypeFor = (file) =>
  file.endsWith(".m3u8") ? "application/x-mpegURL"
  : file.endsWith(".ts") ? "video/mp2t"
  : file.endsWith(".jpg") || file.endsWith(".jpeg") ? "image/jpeg"
  : file.endsWith(".png") ? "image/png"
  // Browsers refuse a text track served as octet-stream.
  : file.endsWith(".vtt") ? "text/vtt"
  : "application/octet-stream";

/** Every object already under a prefix, keyed by name, with its size. */
const objectsUnder = async (bucket, prefix) => {
  const sizes = new Map();
  let token;

  do {
    const page = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token })
    );
    for (const object of page.Contents ?? []) sizes.set(object.Key, object.Size);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);

  return sizes;
};

/**
 * Recursively upload a local directory to s3://bucket/prefix, preserving layout.
 *
 * Files already present at the same size are skipped. A publish is thousands of
 * objects and the better part of an hour on a home connection, and without this
 * any failure near the end threw all of it away — the retry started again from
 * the first segment and stood the same chance of dying at the same place.
 *
 * Size is enough to call an object done. An upload either completes or does not
 * appear at all, so a segment of the right length was written whole; there is no
 * half-uploaded object to mistake for a finished one. Segments are also
 * immutable once written, so a match cannot be a stale different version.
 */
export const uploadDir = async (
  bucket,
  dir,
  prefix,
  { concurrency = DEFAULT_CONCURRENCY, onProgress } = {}
) => {
  const alreadyThere = await objectsUnder(bucket, prefix);
  const pending = [];
  let skipped = 0;

  const walk = (current, keyPrefix) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const key = `${keyPrefix}/${entry.name}`.replace(/\\/g, "/");

      if (entry.isDirectory()) {
        walk(full, key);
      } else if (alreadyThere.get(key) === fs.statSync(full).size) {
        skipped += 1;
      } else {
        pending.push({ key, full });
      }
    }
  };

  walk(dir, prefix);

  // Counted before uploading rather than as files are found, so the first
  // progress report is against the real total instead of a number that keeps
  // growing while the bar is already moving.
  const total = pending.length;
  const limit = pLimit(concurrency);
  let done = 0;

  await Promise.all(
    pending.map(({ key, full }) =>
      limit(async () => {
        await putWithRetry(bucket, key, full);
        done += 1;
        onProgress?.({ done, total, skipped });
      })
    )
  );

  const resumed = skipped ? `, ${skipped} already uploaded` : "";
  console.log(`Uploaded ${total} files to s3://${bucket}/${prefix}${resumed}`);
  return { uploaded: total, skipped };
};

/**
 * Upload one file, in parts when it is large enough to have them.
 *
 * The body is a buffer rather than a stream, which matters more than it looks.
 * A stream can only be consumed once, and a retry re-sends one already at its
 * end — no bytes go out, and S3 eventually closes the connection with "your
 * socket connection to the server was not read from or written to within the
 * timeout period", an error that names a socket and blames the network for what
 * is really an exhausted stream. A buffer is re-sendable and carries its own
 * length. Safe here because publish only ever sends playlists, stills and
 * segments; the multi-gigabyte source is never uploaded.
 *
 * The outer loop retries the upload as a whole, on top of the per-part retries
 * inside it, because the failures worth surviving on this connection are
 * transient and the next attempt usually works.
 */
const putWithRetry = async (bucket, key, filePath, retries = 3) => {
  const body = fs.readFileSync(filePath);

  for (let attempt = 1; ; attempt++) {
    try {
      const upload = new Upload({
        client: s3,
        params: {
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentTypeFor(filePath),
        },
        partSize: PART_SIZE,
        queueSize: PARTS_IN_FLIGHT,
        // Abandoned parts are invisible in a bucket listing and billed until
        // something removes them, so a failed upload cleans up after itself.
        leavePartsOnError: false,
      });

      await upload.done();
      return;
    } catch (err) {
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
};
