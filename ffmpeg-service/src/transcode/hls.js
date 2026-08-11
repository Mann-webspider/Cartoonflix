import fs from "node:fs";
import path from "node:path";
import { hasGpu, runFfmpeg } from "../lib/ffmpeg.js";

/**
 * Rendition ladder, lowest first. `height` drives the scale filter; width is
 * derived from the source aspect ratio so nothing is letterboxed or stretched.
 */
export const LADDER = [
  { name: "480p", height: 480, vBitrateK: 1400 },
  { name: "720p", height: 720, vBitrateK: 2800 },
  { name: "1080p", height: 1080, vBitrateK: 5000 },
];

/**
 * Audio is encoded once and shared by every video rung, so it cannot vary per
 * rendition the way the video bitrate does. Stereo AAC at this rate is
 * transparent enough for a cartoon dub and costs a rounding error next to the
 * video.
 */
const AUDIO_BITRATE_K = 128;

/** The HLS rendition group every alternate audio track joins. */
const AUDIO_GROUP = "audio";

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
 * A variant's name, which ffmpeg substitutes for `%v` in the output paths *and*
 * emits as the NAME attribute a player shows in its menu. One value doing both
 * jobs is ffmpeg's design rather than ours, so it has to survive being a
 * directory name, an S3 key and a URL — hence no spaces or punctuation.
 */
const variantName = (raw, used) => {
  const base = String(raw).replace(/[^A-Za-z0-9-]+/g, "") || "Track";
  let name = base;
  for (let n = 2; used.has(name); n++) name = `${base}-${n}`;
  used.add(name);
  return name;
};

/**
 * Build the -map, codec and -var_stream_map arguments for one job.
 *
 * Audio is mapped as its own rendition group rather than muxed into each video
 * rung. That is what puts an `EXT-X-MEDIA:TYPE=AUDIO` line per language in the
 * master playlist, which is the only reason a player can offer a language menu
 * at all. It also means switching 480p to 1080p no longer re-downloads the
 * audio, and one dub is stored once instead of once per rung.
 *
 * Kept whole rather than split across the caller so the three lists cannot
 * drift: the numbering in -var_stream_map only means anything if it matches the
 * order the -map flags were pushed in.
 *
 * @param {object[]} renditions  from ladderFor()
 * @param {object[]} audio       the `audio` array from probe()
 * @param {number} gop
 * @returns {{maps: string[], codecs: string[], streamMap: string, audioRenditions: {uri: string, label: string}[]}}
 */
export const buildStreamArgs = (renditions, audio, gop) => {
  const maps = [];
  const codecs = [];
  const variants = [];
  const audioNames = [];
  const used = new Set();

  // Without an audio track there is no group to join, and an agroup pointing at
  // nothing makes the master playlist invalid.
  const grouped = audio.length > 0;

  renditions.forEach((rendition, i) => {
    maps.push("-map", `[v${i}out]`);
    codecs.push(...videoCodecArgs(i, rendition, gop));
    const name = variantName(rendition.name, used);
    variants.push(`v:${i}${grouped ? `,agroup:${AUDIO_GROUP}` : ""},name:${name}`);
  });

  // Whichever track the source marks default, else the first. Never a
  // hardcoded language: the same pipeline ingests Japanese-first and
  // Hindi-first releases and must not impose one on the other.
  const defaultIndex = Math.max(
    0,
    audio.findIndex((track) => track.default)
  );

  audio.forEach((track, i) => {
    maps.push("-map", `0:a:${track.index}`);
    codecs.push(`-c:a:${i}`, "aac", `-b:a:${i}`, `${AUDIO_BITRATE_K}k`, `-ac:a:${i}`, "2");
    const name = variantName(track.name, used);
    audioNames.push(name);
    variants.push(
      [
        `a:${i}`,
        `agroup:${AUDIO_GROUP}`,
        `name:${name}`,
        `language:${track.code}`,
        ...(i === defaultIndex ? ["default:yes"] : []),
      ].join(",")
    );
  });

  return {
    maps,
    codecs,
    streamMap: variants.join(" "),
    // Paired with the label here because this is where the names are minted;
    // reconstructing the URI at the call site would be a second source of truth.
    audioRenditions: audio.map((track, i) => ({
      uri: `${audioNames[i]}/playlist.m3u8`,
      label: track.label,
    })),
  };
};

/**
 * Give each alternate audio rendition a human NAME in the master playlist.
 *
 * ffmpeg hardcodes NAME="audio_1", NAME="audio_2" and so on — the
 * `-var_stream_map` `name:` property reaches the output directory but not this
 * attribute, and there is no option that does. NAME is what a player prints in
 * its language menu, so left alone the viewer chooses between "audio_1" and
 * "audio_2" with no clue which one is Hindi.
 *
 * Matching on URI rather than on the existing NAME or on LANGUAGE: the URI
 * holds the variant name this module chose, so it is the one attribute already
 * known to be unique per track.
 */
export const labelAudioRenditions = (playlist, labelByUri) =>
  playlist.replace(/^#EXT-X-MEDIA:TYPE=AUDIO,.*$/gm, (line) => {
    const uri = line.match(/URI="([^"]+)"/)?.[1];
    const label = uri && labelByUri.get(uri);
    // A quote inside the value would end the attribute early and corrupt the
    // rest of the line.
    return label ? line.replace(/NAME="[^"]*"/, `NAME="${label.replace(/"/g, "")}"`) : line;
  });

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
  const audio = source.audio ?? [];
  const gop = Math.max(1, Math.round(source.fps * GOP_SECONDS));
  fs.mkdirSync(outDir, { recursive: true });

  const split = `[0:v]split=${renditions.length}${renditions.map((_, i) => `[v${i}]`).join("")}`;
  const scales = renditions.map((r, i) => `[v${i}]scale=-2:${r.height}[v${i}out]`);

  const { maps, codecs, streamMap, audioRenditions } = buildStreamArgs(renditions, audio, gop);

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
      // %v is the variant name set above, so the tree reads 480p/, 1080p/,
      // Japanese/, Hindi/ rather than v0/ v1/ v2/.
      "-hls_segment_filename",
      ffmpegPath(outDir, "%v", "seg_%03d.ts"),
      "-master_pl_name",
      "master.m3u8",
      "-var_stream_map",
      streamMap,
      ffmpegPath(outDir, "%v", "playlist.m3u8"),
    ],
    {
      durationSec: source.durationSec,
      onProgress: onProgress && ((p) => onProgress({ percent: p.percent })),
    }
  );

  const master = path.join(outDir, "master.m3u8");

  // `-hls_playlist_type vod` writes every playlist at the end of the encode,
  // because a VOD playlist has to list all its segments and close with
  // EXT-X-ENDLIST. So an interrupted run leaves a full tree of .ts files and
  // not one .m3u8 — gigabytes on disk with nothing able to play them, and no
  // manifest, since the pipeline never gets this far.
  //
  // Said plainly here because the symptom points nowhere near the cause: the
  // next line would otherwise fail with ENOENT on a file ffmpeg was never
  // going to write.
  if (!fs.existsSync(master)) {
    throw new Error(
      `ffmpeg finished without writing ${path.basename(master)}. A VOD playlist ` +
        `is only written once the encode completes, so this usually means the ` +
        `transcode was interrupted — the segments already in ${outDir} cannot be ` +
        `played and the title has to be ingested again.`
    );
  }

  if (audioRenditions.length) {
    const labelled = labelAudioRenditions(
      fs.readFileSync(master, "utf8"),
      new Map(audioRenditions.map((rendition) => [rendition.uri, rendition.label]))
    );
    fs.writeFileSync(master, labelled);
  }

  return {
    master,
    renditions: renditions.map((r) => r.name),
    // Recorded for the admin's benefit only. The player reads the languages
    // from master.m3u8 itself, so unlike subtitles these need no database row.
    audio: audio.map((track) => ({ language: track.code, label: track.label })),
    segmentSeconds: SEGMENT_SECONDS,
  };
};
