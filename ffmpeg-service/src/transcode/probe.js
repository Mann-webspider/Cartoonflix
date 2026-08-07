import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { FFPROBE_PATH } from "../lib/ffmpeg.js";

const execFileAsync = promisify(execFile);

/** `"24000/1001"` -> 23.976. Returns null for missing or degenerate values. */
const parseRate = (rate) => {
  if (!rate) return null;
  const [num, den] = rate.split("/").map(Number);
  if (!num || !den) return null;
  return num / den;
};

/**
 * Read the source properties the pipeline branches on: duration drives
 * thumbnail spacing, height caps the rendition ladder, fps sets the GOP size,
 * and a missing audio stream changes the ffmpeg stream mapping.
 *
 * @returns {Promise<{durationSec: number, width: number, height: number, fps: number, hasAudio: boolean}>}
 */
export const probe = async (input) => {
  const { stdout } = await execFileAsync(FFPROBE_PATH, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-show_entries",
    "stream=codec_type,width,height,avg_frame_rate,r_frame_rate",
    "-of",
    "json",
    input,
  ]);

  const { format = {}, streams = [] } = JSON.parse(stdout);
  const video = streams.find((s) => s.codec_type === "video");
  if (!video) throw new Error(`No video stream in ${input}`);

  const durationSec = Number(format.duration);
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error(`Could not read duration from ${input}`);
  }

  return {
    durationSec,
    width: video.width,
    height: video.height,
    fps: parseRate(video.avg_frame_rate) || parseRate(video.r_frame_rate) || 25,
    hasAudio: streams.some((s) => s.codec_type === "audio"),
  };
};
