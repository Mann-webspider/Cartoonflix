import fs from "node:fs";
import path from "node:path";
import pLimit from "p-limit";
import { ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../lib/s3.js";

/**
 * How many uploads run at once.
 *
 * Four rather than eight. A film's HLS tree is thousands of files against a
 * home connection's upstream, and past a certain point extra parallelism stops
 * adding throughput and starts dividing it: connections take turns, one of them
 * goes quiet for more than twenty seconds, and S3 closes it as idle. The error
 * that surfaces talks about sockets and timeouts and says nothing about there
 * having been too many of them.
 */
const DEFAULT_CONCURRENCY = 4;

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
 * Size is enough to call an object done. A PutObject either completes or does
 * not appear at all, so a segment of the right length was written whole; there
 * is no half-uploaded object to mistake for a finished one. Segments are also
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
 * Upload one file, retrying transient failures.
 *
 * The body is read into a buffer rather than streamed, which matters more than
 * it looks. A stream can only be consumed once, and the SDK retries internally
 * before this function ever sees a failure — on that retry it re-sends a stream
 * that is already at its end, so no bytes go out, and S3 eventually closes the
 * connection with "your socket connection to the server was not read from or
 * written to within the timeout period". The error names a socket and blames
 * the network for what is really an exhausted stream.
 *
 * A buffer is re-sendable and carries its own length, so both the SDK's retries
 * and the loop below actually work. Safe here because this only ever uploads
 * playlists, stills and HLS segments — a ten-second 1080p segment is a few
 * megabytes, and the multi-gigabyte source file is never sent at all.
 */
const putWithRetry = async (bucket, key, filePath, retries = 3) => {
  const body = fs.readFileSync(filePath);

  for (let attempt = 1; ; attempt++) {
    try {
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentTypeFor(filePath),
      }));
      return;
    } catch (err) {
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
};
