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

/** Windows reports a crashed process as 0xC0000005 rather than an exit code. */
const ACCESS_VIOLATION = 3221225477;

/**
 * Is NVENC usable right now?
 *
 * Not "was ffmpeg built with it". This build advertises twelve hardware
 * encoders across three vendors, and no machine owns all three — so the encoder
 * list says nothing about the hardware in front of it. On a laptop with
 * switchable graphics the discrete card is not always awake either, which makes
 * the answer a property of this moment rather than of the installation.
 *
 * So encode a frame and look. Asking the list instead is what produced
 * "ffmpeg exited 3221225477": ffmpeg got as far as "No capable devices found"
 * and then died of an access violation, losing the transcode and naming nothing
 * useful on the way out.
 *
 * The probe costs a fraction of a second against a transcode measured in tens
 * of minutes, and is cached for the life of the process. USE_GPU=0 forces
 * software; USE_GPU=1 trusts the caller and skips the probe.
 */
let gpuCache;
export const hasGpu = () => {
  if (gpuCache !== undefined) return gpuCache;
  if (process.env.USE_GPU === "0") return (gpuCache = false);
  if (process.env.USE_GPU === "1") return (gpuCache = true);

  try {
    execFileSync(
      FFMPEG_PATH,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=256x144:rate=25:duration=0.1",
        "-c:v",
        "h264_nvenc",
        "-f",
        "null",
        "-",
      ],
      { stdio: "ignore", timeout: 30_000 }
    );
    gpuCache = true;
  } catch {
    // No card, no driver, or it is asleep. Software encoding is slower, but it
    // finishes, and a crash does not.
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
 * Describe an ffmpeg failure in terms someone can act on.
 *
 * A bare "exited 3221225477" names nothing: it is a Windows access violation,
 * meaning ffmpeg crashed rather than refused. The GPU encoder is the usual
 * reason that happens here, and the way round it is one environment variable,
 * so say which rather than leave the next transcode to fail the same way.
 */
export const describeFailure = (code, stderr = "") => {
  const detail = stderr.trim();
  const crashed = code === ACCESS_VIOLATION ? " (crashed: access violation)" : "";
  const gpu = /no capable devices|nvenc/i.test(detail)
    ? "\n\nThe GPU encoder is unavailable. Set USE_GPU=0 to transcode on the CPU."
    : "";

  return `ffmpeg exited ${code}${crashed}\n${detail}${gpu}`;
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
      code === 0 ? resolve() : reject(new Error(describeFailure(code, stderr)))
    );
  });
