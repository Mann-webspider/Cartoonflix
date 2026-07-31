/**
 * Local transcode entrypoint — runs the SAME pipeline as the Fargate task on
 * your laptop, then marks the content ready via the admin API (since no ECS
 * completion event fires locally).
 *
 * Usage:
 *   node src/cli.js --key <rawKey> --content <contentId>
 * Env: RAW_BUCKET, HLS_BUCKET, CLOUDFRONT_DOMAIN, BACKEND_URL, AWS_REGION
 */
import { run } from "./worker.js";

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const main = async () => {
  const rawKey = arg("--key");
  const contentId = arg("--content");
  if (!rawKey || !contentId) {
    console.error("Usage: node src/cli.js --key <rawKey> --content <contentId>");
    process.exit(2);
  }

  const { videoUrl } = await run({
    rawBucket: process.env.RAW_BUCKET,
    hlsBucket: process.env.HLS_BUCKET,
    rawKey,
    contentId,
    cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN,
  });

  const backend = process.env.BACKEND_URL;
  if (backend) {
    const headers = { "content-type": "application/json" };
    // Content writes require an admin token; pass one via BACKEND_TOKEN.
    if (process.env.BACKEND_TOKEN) headers.authorization = `Bearer ${process.env.BACKEND_TOKEN}`;
    const res = await fetch(`${backend}/api/v1/admin/content/${contentId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ video_url: videoUrl, isReady: true, status: "ready" }),
    });
    console.log(`Marked ready via admin API: ${res.status}`);
  } else {
    console.log("BACKEND_URL not set — skipping ready update. video_url:", videoUrl);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
