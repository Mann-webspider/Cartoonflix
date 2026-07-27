import { ObjectId } from "mongodb";
import { getDb } from "../lib/db.js";

/**
 * EventBridge "ECS Task State Change" (lastStatus STOPPED) -> update content.
 * Reads the contentId the orchestrator set as a container override and the
 * task's exit code, then marks the content ready (or failed) in MongoDB.
 */
export const handler = async (event) => {
  const detail = event.detail ?? {};

  const overrides = detail.overrides?.containerOverrides?.[0]?.environment ?? [];
  const contentId = overrides.find((e) => e.name === "CONTENT_ID")?.value;
  if (!contentId) {
    console.warn("No CONTENT_ID override on task; ignoring");
    return;
  }

  const exitCodes = (detail.containers ?? []).map((c) => c.exitCode ?? 1);
  const success = exitCodes.length > 0 && exitCodes.every((c) => c === 0);

  const db = await getDb();
  const update = success
    ? {
        status: "ready",
        isReady: true,
        video_url: `https://${process.env.CLOUDFRONT_DOMAIN}/${contentId}/master.m3u8`,
      }
    : { status: "failed", isReady: false };

  await db.collection("contents").updateOne(
    { _id: new ObjectId(contentId) },
    { $set: update }
  );
  console.log(`Content ${contentId} -> ${update.status}`);
};
