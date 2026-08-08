import fs from "node:fs";
import path from "node:path";
import { hasGpu, runFfmpeg } from "../lib/ffmpeg.js";

/**
 * Rendition ladder, lowest first. `height` drives the scale filter; width is
 * derived from the source aspect ratio so nothing is letterboxed or stretched.
 */
export const LADDER = [
  { name: "480p", height: 480, vBitrateK: 1400, aBitrateK: 128 },
  { name: "720p", height: 720, vBitrateK: 2800, aBitrateK: 128 },
  { name: "1080p", height: 1080, vBitrateK: 5000, aBitrateK: 192 },
];

/** Target segment length. Keyframes land every GOP_SECONDS, which divides this. */
const SEGMENT_SECONDS = 10;
const GOP_SECONDS = 2;

/**
 * ffmpeg copies its output path separators verbatim into the playlists it
 * writes, so a Windows `path.join` would emit `v0\playlist.m3u8` as a URI and
 * every player would fail to resolve it. HLS URIs are always forward-slashed,
 * and ffmpeg accepts forward slashes on Windows.
 */
export const ffmpegPath = (...parts) => path.join(...parts).replace(/\\/g, "/");

/**
 * Never upscale: a 720p source gets 480p + 720p, not a fake 1080p that costs
 * bitrate and adds no detail.
 *
 * A source below the lowest rung is encoded at its own height rather than
 * stretched up to 480p — the same reasoning, applied at the bottom of the
 * ladder instead of the top.
 */
export const ladderFor = (sourceHeight) => {
  const fits = LADDER.filter((r) => r.height <= sourceHeight);
  if (fits.length) return fits;
  // Even heights only: H.264 chroma subsampling cannot represent an odd one.
  const height = Math.max(2, sourceHeight - (sourceHeight % 2));
  return [{ ...LADDER[0], name: `${height}p`, height }];
};

const videoCodecArgs = (index, rendition, gop) => {
  const codec = hasGpu()
    ? [`-c:v:${index}`, "h264_nvenc", `-preset:v:${index}`, "p5"]
    : [`-c:v:${index}`, "libx264", `-preset:v:${index}`, "veryfast"];
  return [
    ...codec,
    `-b:v:${index}`,
    `${rendition.vBitrateK}k`,
    // Cap the peak so a busy scene cannot blow past the rung it was picked for.
    `-maxrate:v:${index}`,
    `${Math.round(rendition.vBitrateK * 1.07)}k`,
    `-bufsize:v:${index}`,
    `${rendition.vBitrateK * 2}k`,
    // Fixed GOP with scene-cut detection off: every rendition then cuts at the
    // same timestamps, which is what lets a player switch rungs mid-stream.
    `-g:v:${index}`,
    String(gop),
    `-keyint_min:v:${index}`,
    String(gop),
    `-sc_threshold:v:${index}`,
    "0",
  ];
};

/**
 * Transcode `input` into a multi-bitrate HLS ladder under `outDir` in a single
 * ffmpeg pass, writing master.m3u8 alongside one directory per rendition.
 *
 * One pass decodes the source once instead of once per rung, and lets ffmpeg
 * author the master playlist (correct BANDWIDTH, RESOLUTION and CODECS tags)
 * rather than hand-assembling it.
 *
 * @param {string} input
 * @param {string} outDir
 * @param {object} source                 result of probe()
 * @param {(p: {percent: number|null}) => void} [onProgress]
 * @returns {Promise<{master: string, renditions: string[], segmentSeconds: number}>}
 */
export const transcodeToHLS = async (input, outDir, source, onProgress) => {
  const renditions = ladderFor(source.height);
  const gop = Math.max(1, Math.round(source.fps * GOP_SECONDS));
  fs.mkdirSync(outDir, { recursive: true });

  const split = `[0:v]split=${renditions.length}${renditions.map((_, i) => `[v${i}]`).join("")}`;
  const scales = renditions.map((r, i) => `[v${i}]scale=-2:${r.height}[v${i}out]`);

  const maps = [];
  const codecs = [];
  renditions.forEach((rendition, i) => {
    maps.push("-map", `[v${i}out]`);
    codecs.push(...videoCodecArgs(i, rendition, gop));
    if (source.hasAudio) {
      maps.push("-map", "a:0");
      codecs.push(`-c:a:${i}`, "aac", `-b:a:${i}`, `${rendition.aBitrateK}k`, `-ac:a:${i}`, "2");
    }
  });

  const streamMap = renditions
    .map((_, i) => (source.hasAudio ? `v:${i},a:${i}` : `v:${i}`))
    .join(" ");

  await runFfmpeg(
    [
      "-i",
      input,
      "-filter_complex",
      [split, ...scales].join(";"),
      ...maps,
      ...codecs,
      "-f",
      "hls",
      "-hls_time",
      String(SEGMENT_SECONDS),
      "-hls_playlist_type",
      "vod",
      // Tells the player each segment can be decoded on its own, which is what
      // makes mid-stream rung switching seamless.
      "-hls_flags",
      "independent_segments",
      "-hls_segment_type",
      "mpegts",
      "-hls_segment_filename",
      ffmpegPath(outDir, "v%v", "seg_%03d.ts"),
      "-master_pl_name",
      "master.m3u8",
      "-var_stream_map",
      streamMap,
      ffmpegPath(outDir, "v%v", "playlist.m3u8"),
    ],
    {
      durationSec: source.durationSec,
      onProgress: onProgress && ((p) => onProgress({ percent: p.percent })),
    }
  );

  return {
    master: path.join(outDir, "master.m3u8"),
    renditions: renditions.map((r) => r.name),
    segmentSeconds: SEGMENT_SECONDS,
  };
};
