/**
 * ffmpeg/ffprobe binary resolution and process running.
 *
 * A system ffmpeg is preferred when present (it may carry NVENC); the bundled
 * static binaries are the fallback so the pipeline works on a bare checkout.
 */
import { spawn } from "node:child_process";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";

export const FFMPEG_PATH = process.env.FFMPEG_PATH || ffmpegStatic;
export const FFPROBE_PATH = process.env.FFPROBE_PATH || ffprobeStatic.path;

/**
 * Hardware encoding, opt-in with USE_GPU=1.
 *
 * This used to switch itself on by looking for h264_nvenc in ffmpeg's encoder
 * list, which reports what the binary was *built* with rather than what the
 * machine actually has — a stock build advertises NVENC, AMF and QSV at once,
 * and no computer owns all three.
 *
 * Software is the default even where a GPU is genuinely present, because NVENC
 * buys its speed with bits. Measured on this library's own footage, it needed
 * 34.8 MB to carry a clip that x264 carried in 18.1 MB at the same perceptual
 * score. Transcoding happens once, offline, on a machine that is idle anyway;
 * the bytes are paid for every month, forever. Set USE_GPU=1 when a title is
 * wanted now rather than small.
 */
export const useGpu = () => process.env.USE_GPU === "1";

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
