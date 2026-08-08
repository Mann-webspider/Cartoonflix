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
 * Subtitle codecs that are actually text and can therefore become WebVTT.
 *
 * The ones deliberately absent — hdmv_pgs_subtitle (Blu-ray) and dvd_subtitle —
 * are bitmap formats: each cue is a picture, not a string. Converting them
 * needs OCR, not a remux, so they are reported as unconvertible rather than
 * failing the whole ingest.
 */
const TEXT_SUBTITLE_CODECS = new Set(["subrip", "srt", "ass", "ssa", "mov_text", "webvtt", "text"]);

/**
 * ISO 639-2 is what container tags carry; HTML wants 639-1. Only the codes
 * likely to turn up in this library are mapped — anything else passes through
 * unchanged, which still gives the player a usable, if verbose, label.
 */
const ISO_639_2_TO_1 = {
  eng: "en",
  jpn: "ja",
  hin: "hi",
  spa: "es",
  fre: "fr",
  fra: "fr",
  ger: "de",
  deu: "de",
  ita: "it",
  por: "pt",
  rus: "ru",
  kor: "ko",
  chi: "zh",
  zho: "zh",
  ara: "ar",
  tam: "ta",
  tel: "te",
  ben: "bn",
  mar: "mr",
  guj: "gu",
  urd: "ur",
  nld: "nl",
  dut: "nl",
  pol: "pl",
  tur: "tr",
  tha: "th",
  vie: "vi",
  ind: "id",
};

const LANGUAGE_NAMES = {
  en: "English",
  ja: "Japanese",
  hi: "Hindi",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  ta: "Tamil",
  te: "Telugu",
  bn: "Bengali",
  mr: "Marathi",
  gu: "Gujarati",
  ur: "Urdu",
  nl: "Dutch",
  pl: "Polish",
  tr: "Turkish",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
};

export const normaliseLanguage = (raw) => {
  const code = (raw || "").toLowerCase().trim();
  if (!code || code === "und") return { code: "und", name: "Unknown" };
  const short = ISO_639_2_TO_1[code] || code.slice(0, 2);
  return { code: short, name: LANGUAGE_NAMES[short] || raw };
};

/** Build the label a viewer reads in the captions menu. */
export const subtitleLabel = ({ title, language, forced, index }) => {
  if (title) return title;
  const { name } = normaliseLanguage(language);
  const base = name === "Unknown" ? `Track ${index + 1}` : name;
  return forced ? `${base} (forced)` : base;
};

/**
 * Read the source properties the pipeline branches on: duration drives
 * thumbnail spacing, height caps the rendition ladder, fps sets the GOP size,
 * a missing audio stream changes the ffmpeg stream mapping, and embedded
 * subtitle streams become WebVTT tracks.
 *
 * @returns {Promise<{durationSec: number, width: number, height: number, fps: number, hasAudio: boolean, subtitles: object[]}>}
 */
export const probe = async (input) => {
  const { stdout } = await execFileAsync(FFPROBE_PATH, [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-show_entries",
    "stream=index,codec_type,codec_name,width,height,avg_frame_rate,r_frame_rate",
    "-show_entries",
    "stream_tags=language,title",
    "-show_entries",
    "stream_disposition=forced,default",
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

  // `-map 0:s:N` counts subtitle streams from zero in their own namespace, not
  // by the absolute stream index, so the position within the filtered list is
  // what the extractor needs.
  const subtitles = streams
    .filter((stream) => stream.codec_type === "subtitle")
    .map((stream, index) => {
      const language = stream.tags?.language;
      const forced = stream.disposition?.forced === 1;
      return {
        index,
        codec: stream.codec_name,
        text: TEXT_SUBTITLE_CODECS.has(stream.codec_name),
        forced,
        default: stream.disposition?.default === 1,
        ...normaliseLanguage(language),
        label: subtitleLabel({ title: stream.tags?.title, language, forced, index }),
      };
    });

  return {
    durationSec,
    width: video.width,
    height: video.height,
    fps: parseRate(video.avg_frame_rate) || parseRate(video.r_frame_rate) || 25,
    hasAudio: streams.some((s) => s.codec_type === "audio"),
    subtitles,
  };
};
