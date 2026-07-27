import { GetObjectCommand } from "@aws-sdk/client-s3";
import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import { s3 } from "../lib/s3.js";

/** Download an S3 object to a local file. */
export const downloadFromS3 = async (bucket, key, destPath) => {
  console.log(`Downloading s3://${bucket}/${key} -> ${destPath}`);
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  await pipeline(res.Body, fs.createWriteStream(destPath));
  console.log("Download complete");
};
