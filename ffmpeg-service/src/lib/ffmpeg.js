/**
 * ffmpeg/ffprobe binary resolution and process running.
 *
 * A system ffmpeg is preferred when present (it may carry NVENC); the bundled
 * static binaries are the fallback so the pipeline works on a bare checkout.
 */
import { spawn, execFileSync } from "node:child_process";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

export const FFMPEG_PATH = process.env.FFMPEG_PATH || ffmpegStatic;
export const FFPROBE_PATH = process.env.FFPROBE_PATH || ffprobeStatic.path;

/** Detect NVENC once. USE_GPU=0 forces CPU, USE_GPU=1 forces GPU. */
let gpuCache;
export const hasGpu = () => {
  if (gpuCache !== undefined) return gpuCache;
  if (process.env.USE_GPU === "0") return (gpuCache = false);
  if (process.env.USE_GPU === "1") return (gpuCache = true);
  try {
    const encoders = execFileSync(FFMPEG_PATH, ["-hide_banner", "-encoders"], {
      encoding: "utf8",
    });
    gpuCache = encoders.includes("h264_nvenc");
  } catch {
    gpuCache = false;
  }
  return gpuCache;
};

/** `HH:MM:SS.mmm` -> seconds. */
export const timemarkToSeconds = (timemark) => {
  const [h, m, s] = timemark.split(":").map(Number);
  return h * 3600 + m * 60 + s;
};

/**
 * Run ffmpeg to completion.
 *
 * `-progress pipe:1` emits `key=value` lines on stdout; `out_time_us` is the
 * authoritative position, which beats parsing the human-readable stderr.
 *
 * @param {string[]} args
 * @param {object} [opts]
 * @param {number} [opts.durationSec]  enables percent in onProgress
 * @param {(p: {seconds: number, percent: number|null}) => void} [opts.onProgress]
 */
export const runFfmpeg = (args, { durationSec, onProgress } = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(FFMPEG_PATH, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-nostats",
      "-progress",
      "pipe:1",
      ...args,
    ]);

    let pending = "";
    child.stdout.on("data", (chunk) => {
      if (!onProgress) return;
      pending += chunk.toString();
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) {
        const [key, value] = line.split("=");
        if (key !== "out_time_us" || !value) continue;
        const seconds = Number(value) / 1_000_000;
        if (!Number.isFinite(seconds)) continue;
        onProgress({
          seconds,
          percent: durationSec ? Math.min(100, (seconds / durationSec) * 100) : null,
        });
      }
    });

    // ffmpeg writes gigabytes of nothing on success and one useful paragraph on
    // failure; keep only the tail so a crash message stays readable.
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk.toString()).slice(-8192);
    });

    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`ffmpeg exited ${code}\n${stderr.trim()}`))
    );
  });
