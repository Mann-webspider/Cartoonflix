import fs from "node:fs";
import path from "node:path";
import pLimit from "p-limit";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../lib/s3.js";

export const contentTypeFor = (file) =>
  file.endsWith(".m3u8") ? "application/x-mpegURL"
  : file.endsWith(".ts") ? "video/mp2t"
  : file.endsWith(".jpg") || file.endsWith(".jpeg") ? "image/jpeg"
  : file.endsWith(".png") ? "image/png"
  // Browsers refuse a text track served as octet-stream.
  : file.endsWith(".vtt") ? "text/vtt"
  : "application/octet-stream";

/**
 * Recursively upload a local directory to s3://bucket/prefix, preserving layout.
 * Concurrency-limited; retries transient failures.
 */
export const uploadDir = async (bucket, dir, prefix, concurrency = 8) => {
  const limit = pLimit(concurrency);
  const jobs = [];

  const walk = (current, keyPrefix) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const key = `${keyPrefix}/${entry.name}`.replace(/\\/g, "/");
      if (entry.isDirectory()) {
        walk(full, key);
      } else {
        jobs.push(limit(() => putWithRetry(bucket, key, full)));
      }
    }
  };

  walk(dir, prefix);
  await Promise.all(jobs);
  console.log(`Uploaded ${jobs.length} files to s3://${bucket}/${prefix}`);
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
