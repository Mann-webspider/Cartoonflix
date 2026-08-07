import fs from "node:fs";
import path from "node:path";
import { runFfmpeg } from "../lib/ffmpeg.js";

const DEFAULT_COUNT = 10;
const THUMB_HEIGHT = 360;

/**
 * Sample points spread across the middle 90% of the runtime. The first and last
 * few percent are skipped because that is where studio logos, black frames and
 * end credits live — none of which make a usable poster.
 */
export const samplePoints = (durationSec, count) => {
  const start = durationSec * 0.05;
  const span = durationSec * 0.9;
  return Array.from({ length: count }, (_, i) => start + (span * (i + 0.5)) / count);
};

/**
 * Extract evenly spaced stills for the admin to choose a poster and thumbnail
 * from. Each frame is grabbed with an input-side `-ss`, so ffmpeg seeks
 * directly to the keyframe instead of decoding the file up to that point.
 *
 * @param {string} input
 * @param {string} outDir
 * @param {number} durationSec
 * @param {number} [count]
 * @returns {Promise<string[]>} file names, in timeline order
 */
export const extractThumbnails = async (input, outDir, durationSec, count = DEFAULT_COUNT) => {
  fs.mkdirSync(outDir, { recursive: true });
  const names = [];

  for (const [index, seconds] of samplePoints(durationSec, count).entries()) {
    const name = `${String(index + 1).padStart(3, "0")}.jpg`;
    await runFfmpeg([
      "-ss",
      seconds.toFixed(3),
      "-i",
      input,
      "-frames:v",
      "1",
      "-vf",
      `scale=-2:${THUMB_HEIGHT}`,
      "-q:v",
      "3",
      "-y",
      path.join(outDir, name),
    ]);
    names.push(name);
  }

  return names;
};
