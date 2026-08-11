import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { transcodeToHLS } from "./hls.js";

/** Sampling defaults: enough spread to average out a quiet stretch, still quick. */
const SAMPLES = 3;
const SAMPLE_SECONDS = 4;

/** Total bytes of every file beneath a directory. */
const dirBytes = (dir) => {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirBytes(full) : fs.statSync(full).size;
  }
  return total;
};

/**
 * Points to sample from, avoiding the opening and the credits.
 *
 * Both ends of a film are unrepresentative — a title card and a scroll compress
 * to almost nothing, so sampling them would promise a file half the size of the
 * one actually produced.
 */
const samplePoints = (durationSec, count, sampleSeconds) => {
  const from = durationSec * 0.1;
  const to = durationSec * 0.9 - sampleSeconds;
  if (to <= from) return [Math.max(0, durationSec / 2 - sampleSeconds / 2)];
  const step = (to - from) / Math.max(1, count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(from + step * i));
};

/**
 * Predict the size of a ladder without encoding the whole film.
 *
 * Encodes a few seconds from several points at the real settings and scales the
 * result up. Sampling rather than arithmetic because the ladder is
 * constant-quality: the bitrate cap is a ceiling that ordinary content never
 * reaches, so multiplying it by the runtime overstates the result two- or
 * threefold — an estimate wrong in that direction is worse than none, since it
 * argues for lowering quality that was never the problem.
 *
 * The samples run through `transcodeToHLS` itself rather than a parallel set of
 * arguments, so the estimate cannot drift away from what the real encode does.
 *
 * @param {string} input
 * @param {object} source                              result of probe()
 * @param {object} [options]
 * @param {{name: string, crf?: number, maxrateK?: number}[]} [options.ladder]
 * @param {(p: {percent: number}) => void} [options.onProgress]
 * @returns {Promise<object>} per-rung and total predictions, plus what was measured
 */
export const estimateLadder = async (
  input,
  source,
  { ladder, samples = SAMPLES, sampleSeconds = SAMPLE_SECONDS, onProgress } = {}
) => {
  const points = samplePoints(source.durationSec, samples, sampleSeconds);
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "cf-estimate-"));

  /** rung or audio directory name -> bytes measured across every sample */
  const measured = new Map();
  let encodedSeconds = 0;
  let renditions = [];

  try {
    for (const [index, startSec] of points.entries()) {
      const sampleDir = path.join(workDir, `s${index}`);
      const result = await transcodeToHLS(input, sampleDir, source, {
        ladder,
        trim: { startSec, seconds: sampleSeconds },
      });
      renditions = result.renditions;

      for (const entry of fs.readdirSync(sampleDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const bytes = dirBytes(path.join(sampleDir, entry.name));
        measured.set(entry.name, (measured.get(entry.name) ?? 0) + bytes);
      }

      // What was actually encoded, which is not always what was asked for: a
      // sample near the end can run short, and dividing by the requested length
      // would then understate every bitrate.
      encodedSeconds += sampleSeconds;
      onProgress?.({ percent: Math.round(((index + 1) / points.length) * 100) });
    }

    const scale = source.durationSec / encodedSeconds;
    const kbps = (bytes) => Math.round((bytes * 8) / encodedSeconds / 1000);

    const video = renditions.map((rendition) => {
      const bytes = measured.get(rendition.name) ?? 0;
      return {
        name: rendition.name,
        height: rendition.height,
        crf: rendition.crf,
        maxrateK: rendition.maxrateK,
        kbps: kbps(bytes),
        bytes: Math.round(bytes * scale),
      };
    });

    const videoNames = new Set(renditions.map((rendition) => rendition.name));
    const audio = [...measured.entries()]
      .filter(([name]) => !videoNames.has(name))
      .map(([name, bytes]) => ({ name, kbps: kbps(bytes), bytes: Math.round(bytes * scale) }));

    const total = [...video, ...audio].reduce((sum, entry) => sum + entry.bytes, 0);

    return {
      durationSec: Math.round(source.durationSec),
      sampledSeconds: encodedSeconds,
      samplePoints: points,
      video,
      audio,
      totalBytes: total,
      sourceBytes: fs.statSync(input).size,
    };
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
};
