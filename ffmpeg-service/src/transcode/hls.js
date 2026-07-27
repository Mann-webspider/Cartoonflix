import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Prefer a system ffmpeg (may have NVENC); fall back to the bundled static binary (CPU only).
const FFMPEG_PATH = process.env.FFMPEG_PATH || ffmpegStatic;
ffmpeg.setFfmpegPath(FFMPEG_PATH);

const RENDITIONS = [
  { name: "480p", width: 854, height: 480, vbitrate: "1400k", abitrate: "128k" },
  { name: "720p", width: 1280, height: 720, vbitrate: "2800k", abitrate: "128k" },
  { name: "1080p", width: 1920, height: 1080, vbitrate: "5000k", abitrate: "192k" },
];

/** Detect NVENC once. USE_GPU=0 forces CPU; USE_GPU=1 forces GPU. */
let _gpu;
const hasGpu = () => {
  if (_gpu !== undefined) return _gpu;
  if (process.env.USE_GPU === "0") return (_gpu = false);
  if (process.env.USE_GPU === "1") return (_gpu = true);
  try {
    const out = execFileSync(FFMPEG_PATH, ["-hide_banner", "-encoders"], { encoding: "utf8" });
    _gpu = out.includes("h264_nvenc");
  } catch {
    _gpu = false;
  }
  console.log(`Transcode encoder: ${_gpu ? "h264_nvenc (GPU)" : "libx264 (CPU)"}`);
  return _gpu;
};

const videoOpts = (r) =>
  hasGpu()
    ? [`-c:v h264_nvenc`, `-preset p5`, `-b:v ${r.vbitrate}`]
    : [`-c:v libx264`, `-preset veryfast`, `-b:v ${r.vbitrate}`];

const transcodeRendition = (input, outDir, r) =>
  new Promise((resolve, reject) => {
    const dir = path.join(outDir, r.name);
    fs.mkdirSync(dir, { recursive: true });
    const playlist = path.join(dir, `${r.name}.m3u8`);

    ffmpeg(input)
      .outputOptions([
        ...videoOpts(r),
        `-vf scale=${r.width}:${r.height}`,
        `-c:a aac`,
        `-b:a ${r.abitrate}`,
        `-f hls`,
        `-hls_time 6`,
        `-hls_playlist_type vod`,
        `-hls_segment_filename ${path.join(dir, `${r.name}_%03d.ts`)}`,
      ])
      .output(playlist)
      .on("end", () => resolve(r))
      .on("error", reject)
      .run();
  });

/**
 * Transcode an input file into a multi-bitrate HLS ladder under outDir,
 * writing a master.m3u8. Returns the master playlist path.
 */
export const transcodeToHLS = async (input, outDir) => {
  fs.mkdirSync(outDir, { recursive: true });

  for (const r of RENDITIONS) {
    console.log(`Transcoding ${r.name}...`);
    await transcodeRendition(input, outDir, r);
  }

  const master =
    "#EXTM3U\n" +
    RENDITIONS.map(
      (r) =>
        `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(r.vbitrate) * 1000},RESOLUTION=${r.width}x${r.height}\n${r.name}/${r.name}.m3u8`
    ).join("\n") +
    "\n";

  const masterPath = path.join(outDir, "master.m3u8");
  fs.writeFileSync(masterPath, master);
  console.log("Wrote master.m3u8");
  return masterPath;
};
