import fs from "node:fs";
import path from "node:path";
import { probe } from "./transcode/probe.js";
import { transcodeToHLS } from "./transcode/hls.js";
import { extractThumbnails } from "./transcode/thumbnails.js";
import { extractSubtitles } from "./transcode/subtitles.js";

export const MEDIA_ROOT = process.env.MEDIA_ROOT || path.resolve("media");

/**
 * Storage key for one playable item. A movie is keyed by its content id; an
 * episode nests under the series it belongs to. The same string is used for the
 * local directory and the S3 prefix, so local and remote layouts stay identical
 * and a publish is a plain directory copy.
 */
export const slugFor = ({ contentId, season, episode }) =>
  season && episode ? `${contentId}/s${season}e${episode}` : String(contentId);

export const jobDir = (slug, root = MEDIA_ROOT) => path.join(root, ...slug.split("/"));

/**
 * Percent of the whole job, per stage. Transcoding dominates the wall clock, so
 * it owns the bulk of the bar and the other stages get token slices.
 */
const STAGES = {
  probe: [0, 2],
  transcode: [2, 88],
  subtitles: [88, 92],
  thumbnails: [92, 100],
};
const overall = (stage, percent) => {
  const [from, to] = STAGES[stage];
  return Math.round(from + ((to - from) * (percent ?? 0)) / 100);
};

/**
 * Transcode one source file into a local HLS ladder plus contact-sheet stills.
 *
 * Everything stays on disk under `media/<slug>/`; nothing touches S3 or the
 * database. Publishing is a separate, explicit step so the admin can review the
 * stills and pick a poster before anything is uploaded.
 *
 * @param {object} job
 * @param {string} job.sourcePath        local video file to ingest
 * @param {string} job.slug              see slugFor()
 * @param {number} [job.thumbnailCount]
 * @param {string} [job.root]
 * @param {(p: {stage: string, percent: number}) => void} [job.onProgress]
 * @returns {Promise<object>} the manifest, also written to manifest.json
 */
export const ingest = async ({
  sourcePath,
  slug,
  thumbnailCount,
  root = MEDIA_ROOT,
  onProgress = () => {},
}) => {
  if (!sourcePath || !slug) throw new Error("ingest: sourcePath and slug are required");
  if (!fs.existsSync(sourcePath)) throw new Error(`ingest: source not found: ${sourcePath}`);

  const dir = jobDir(slug, root);
  const hlsDir = path.join(dir, "hls");
  const thumbsDir = path.join(dir, "thumbs");
  const subsDir = path.join(dir, "subs");
  fs.mkdirSync(dir, { recursive: true });

  onProgress({ stage: "probe", percent: overall("probe", 0) });
  const source = await probe(sourcePath);

  onProgress({ stage: "transcode", percent: overall("transcode", 0) });
  const hls = await transcodeToHLS(sourcePath, hlsDir, source, ({ percent }) =>
    onProgress({ stage: "transcode", percent: overall("transcode", percent) })
  );

  onProgress({ stage: "subtitles", percent: overall("subtitles", 0) });
  const { tracks: subtitles, skipped: skippedSubtitles } = await extractSubtitles(
    sourcePath,
    subsDir,
    source.subtitles
  );

  onProgress({ stage: "thumbnails", percent: overall("thumbnails", 0) });
  const thumbnails = await extractThumbnails(
    sourcePath,
    thumbsDir,
    source.durationSec,
    thumbnailCount
  );

  const manifest = {
    slug,
    source: {
      file: path.basename(sourcePath),
      durationSec: Math.round(source.durationSec),
      width: source.width,
      height: source.height,
      fps: Number(source.fps.toFixed(3)),
      hasAudio: source.hasAudio,
      sizeBytes: fs.statSync(sourcePath).size,
    },
    hls: {
      master: "hls/master.m3u8",
      renditions: hls.renditions,
      segmentSeconds: hls.segmentSeconds,
    },
    thumbnails,
    subtitles,
    // Recorded so the admin can see WHY a track is missing — a Blu-ray rip with
    // only PGS subtitles otherwise looks like the pipeline simply ignored them.
    skippedSubtitles,
    completedAt: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  onProgress({ stage: "thumbnails", percent: 100 });
  return manifest;
};

/** Read a completed job's manifest, or null if it has not been ingested yet. */
export const readManifest = (slug, root = MEDIA_ROOT) => {
  const file = path.join(jobDir(slug, root), "manifest.json");
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
};

export const writeManifest = (slug, manifest, root = MEDIA_ROOT) => {
  const file = path.join(jobDir(slug, root), "manifest.json");
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2));
  return manifest;
};
