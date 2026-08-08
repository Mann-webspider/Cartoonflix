import fs from "node:fs";
import path from "node:path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "./lib/s3.js";
import { uploadDir, contentTypeFor } from "./s3/upload.js";
import { jobDir, readManifest, MEDIA_ROOT } from "./pipeline.js";

const cdnUrl = (domain, key) => `https://${domain}/${key}`;

/**
 * Push a completed local job to S3 and return the URLs the database should
 * store.
 *
 * The HLS tree keeps its `<slug>/` prefix so the master playlist's relative
 * segment paths resolve unchanged. Chosen stills go under `posters/`, the one
 * CloudFront path served without signing, so `<img>` tags load them directly.
 *
 * @param {object} args
 * @param {string} args.slug
 * @param {string} args.contentId
 * @param {string} args.hlsBucket
 * @param {string} args.cloudfrontDomain
 * @param {string} [args.poster]     thumbnail file name to publish as the poster
 * @param {string} [args.thumbnail]  thumbnail file name to publish as the card image
 * @param {string} [args.root]
 * @returns {Promise<{videoUrl: string, posterUrl?: string, thumbnailUrl?: string, durationSec: number}>}
 */
export const publish = async ({
  slug,
  contentId,
  hlsBucket,
  cloudfrontDomain,
  poster,
  thumbnail,
  root = MEDIA_ROOT,
}) => {
  if (!hlsBucket || !cloudfrontDomain) {
    throw new Error("publish: hlsBucket and cloudfrontDomain are required");
  }

  const manifest = readManifest(slug, root);
  if (!manifest) throw new Error(`publish: no completed job for ${slug} — ingest it first`);

  const dir = jobDir(slug, root);
  await uploadDir(hlsBucket, path.join(dir, "hls"), slug);

  // Subtitles sit beside the stream under the same prefix, so one CloudFront
  // behaviour and one CORS policy cover both.
  const subsDir = path.join(dir, "subs");
  const subtitles = [];
  if (fs.existsSync(subsDir) && (manifest.subtitles?.length ?? 0) > 0) {
    await uploadDir(hlsBucket, subsDir, `${slug}/subs`);
    for (const track of manifest.subtitles) {
      subtitles.push({
        language: track.language,
        label: track.label,
        url: cdnUrl(cloudfrontDomain, `${slug}/subs/${track.file}`),
        source: track.source,
      });
    }
  }

  // Episodes each need their own still, so the object name carries the slug's
  // episode part rather than a fixed "poster.jpg" that siblings would overwrite.
  const suffix = slug === contentId ? "" : `-${slug.split("/").pop()}`;
  const uploadStill = async (fileName, role) => {
    if (!fileName) return undefined;
    const local = path.join(dir, "thumbs", fileName);
    if (!fs.existsSync(local)) throw new Error(`publish: still not found: ${local}`);
    const key = `posters/${contentId}/${role}${suffix}.jpg`;
    await s3.send(
      new PutObjectCommand({
        Bucket: hlsBucket,
        Key: key,
        Body: fs.createReadStream(local),
        ContentType: contentTypeFor(local),
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    return cdnUrl(cloudfrontDomain, key);
  };

  return {
    videoUrl: cdnUrl(cloudfrontDomain, `${slug}/master.m3u8`),
    posterUrl: await uploadStill(poster, "poster"),
    thumbnailUrl: await uploadStill(thumbnail, "thumb"),
    durationSec: manifest.source.durationSec,
    subtitles,
  };
};
