import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { downloadFromS3 } from "./s3/download.js";
import { uploadDir } from "./s3/upload.js";
import { probe } from "./transcode/probe.js";
import { transcodeToHLS } from "./transcode/hls.js";

/**
 * Run one transcode job end to end: download raw -> HLS -> upload.
 * The same function powers the Fargate task and the local CLI.
 *
 * @param {object} job
 * @param {string} job.rawBucket
 * @param {string} job.hlsBucket
 * @param {string} job.rawKey     S3 key of the uploaded source video
 * @param {string} job.contentId  used as the HLS output prefix
 * @param {string} [job.cloudfrontDomain]
 * @returns {Promise<{videoUrl: string, prefix: string}>}
 */
export const run = async (job) => {
  const { rawBucket, hlsBucket, rawKey, contentId, cloudfrontDomain } = job;
  if (!rawBucket || !hlsBucket || !rawKey || !contentId) {
    throw new Error("worker: missing required job fields (rawBucket, hlsBucket, rawKey, contentId)");
  }

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "cf-"));
  const input = path.join(workDir, "source");
  const outDir = path.join(workDir, "hls");

  try {
    await downloadFromS3(rawBucket, rawKey, input);
    const source = await probe(input);
    await transcodeToHLS(input, outDir, source, ({ percent }) =>
      console.log(`Transcoding: ${Math.round(percent ?? 0)}%`)
    );
    await uploadDir(hlsBucket, outDir, contentId);

    const videoUrl = cloudfrontDomain
      ? `https://${cloudfrontDomain}/${contentId}/master.m3u8`
      : `${contentId}/master.m3u8`;
    console.log("Transcode job done:", videoUrl);
    return { videoUrl, prefix: contentId };
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
};

const jobFromEnv = () => ({
  rawBucket: process.env.RAW_BUCKET,
  hlsBucket: process.env.HLS_BUCKET,
  rawKey: process.env.RAW_KEY,
  contentId: process.env.CONTENT_ID,
  cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN,
});

// Executed as the container entrypoint: job comes from env, process exits with
// the job's status. In the cloud the completion Lambda reacts to that exit code;
// locally the CLI marks the content ready itself.
const isEntry = process.argv[1] && process.argv[1].endsWith("worker.js");
if (isEntry) {
  run(jobFromEnv())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Transcode failed:", err);
      process.exit(1);
    });
}
