import fs from "node:fs";
import path from "node:path";
import { runFfmpeg } from "../lib/ffmpeg.js";
import { normaliseLanguage } from "./probe.js";

/** Filenames must survive an S3 key and a URL, so keep them boring. */
const safeSlug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "track";

/**
 * Extract every text subtitle stream from the source as WebVTT.
 *
 * Bitmap tracks (Blu-ray PGS, DVD VOBSUB) are skipped and reported rather than
 * attempted: their cues are images, so turning them into text needs OCR, and a
 * failed remux would otherwise take the whole ingest down with it.
 *
 * @param {string} input
 * @param {string} outDir
 * @param {object[]} streams  the `subtitles` array from probe()
 * @returns {Promise<{tracks: object[], skipped: object[]}>}
 */
export const extractSubtitles = async (input, outDir, streams = []) => {
  const tracks = [];
  const skipped = [];
  if (!streams.length) return { tracks, skipped };

  fs.mkdirSync(outDir, { recursive: true });
  const used = new Set();

  for (const stream of streams) {
    if (!stream.text) {
      skipped.push({ ...stream, reason: `${stream.codec} is a bitmap format and needs OCR` });
      continue;
    }

    // Two English tracks would collide on one filename; suffix the later ones.
    let name = safeSlug(`${stream.code}${stream.forced ? "-forced" : ""}`);
    if (used.has(name)) name = `${name}-${stream.index}`;
    used.add(name);

    const file = `${name}.vtt`;
    try {
      await runFfmpeg([
        "-i",
        input,
        "-map",
        `0:s:${stream.index}`,
        "-c:s",
        "webvtt",
        "-y",
        path.join(outDir, file),
      ]);
    } catch (err) {
      // One malformed track is not worth losing the transcode over.
      skipped.push({ ...stream, reason: err.message.split("\n")[0] });
      continue;
    }

    tracks.push({
      file,
      language: stream.code,
      label: stream.label,
      forced: stream.forced,
      default: stream.default,
      source: "embedded",
    });
  }

  return { tracks, skipped };
};

/**
 * Convert an uploaded sidecar file (.srt, .ass, .ssa, .vtt) to WebVTT.
 *
 * Sidecars exist because plenty of sources carry no embedded tracks at all —
 * an mp4 rip usually has none, while the subtitles sit next to it in a file.
 *
 * @returns {Promise<object>} the track record to store on the content document
 */
export const convertSidecar = async (input, outDir, { language, label }) => {
  fs.mkdirSync(outDir, { recursive: true });

  const { code, name } = normaliseLanguage(language);
  let file = `${safeSlug(code)}.vtt`;
  // Never silently replace an existing track for the same language.
  let attempt = 2;
  while (fs.existsSync(path.join(outDir, file))) {
    file = `${safeSlug(code)}-${attempt++}.vtt`;
  }

  await runFfmpeg(["-i", input, "-c:s", "webvtt", "-y", path.join(outDir, file)]);

  return {
    file,
    language: code,
    label: label || name,
    forced: false,
    default: false,
    source: "uploaded",
  };
};
