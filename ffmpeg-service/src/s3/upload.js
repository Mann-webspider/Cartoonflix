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

const putWithRetry = async (bucket, key, filePath, retries = 3) => {
  for (let attempt = 1; ; attempt++) {
    try {
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fs.createReadStream(filePath),
        ContentType: contentTypeFor(filePath),
      }));
      return;
    } catch (err) {
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
};
