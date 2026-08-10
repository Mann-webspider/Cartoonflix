import test from "node:test";
import assert from "node:assert/strict";
import { slugFor } from "./pipeline.js";
import {
  ladderFor,
  LADDER,
  ffmpegPath,
  buildStreamArgs,
  labelAudioRenditions,
} from "./transcode/hls.js";
import { samplePoints } from "./transcode/thumbnails.js";
import { normaliseLanguage, trackLabel } from "./transcode/probe.js";
import { extractSubtitles } from "./transcode/subtitles.js";
import { cdnUrl } from "./lib/cdn.js";

test("slugFor keys movies flat and episodes under their series", () => {
  assert.equal(slugFor({ contentId: "abc" }), "abc");
  assert.equal(slugFor({ contentId: "abc", season: 1, episode: 2 }), "abc/s1e2");
  // A season without an episode is not addressable, so it stays a movie key.
  assert.equal(slugFor({ contentId: "abc", season: 1 }), "abc");
});

test("ladderFor never upscales past the source", () => {
  assert.deepEqual(
    ladderFor(1080).map((r) => r.name),
    ["480p", "720p", "1080p"]
  );
  assert.deepEqual(
    ladderFor(720).map((r) => r.name),
    ["480p", "720p"]
  );
  // 900p sits between rungs: take what fits, invent nothing.
  assert.deepEqual(
    ladderFor(900).map((r) => r.name),
    ["480p", "720p"]
  );
  // Below the lowest rung, encode at the source's own height rather than
  // stretching a 360p cartoon rip up to 480p.
  assert.deepEqual(
    ladderFor(360).map((r) => ({ name: r.name, height: r.height })),
    [{ name: "360p", height: 360 }]
  );
  // Odd heights round down: H.264 chroma subsampling needs even dimensions.
  assert.equal(ladderFor(361)[0].height, 360);
  assert.equal(LADDER[0].height, 480, "the ladder's lowest rung is unchanged");
});

test("ffmpegPath emits forward slashes so playlist URIs stay valid", () => {
  // ffmpeg copies these separators straight into master.m3u8. A backslash here
  // produces `v0\playlist.m3u8`, which no HLS player can resolve.
  const result = ffmpegPath("media", "abc", "hls", "v%v", "playlist.m3u8");
  assert.ok(!result.includes("\\"), `expected no backslashes, got ${result}`);
  assert.ok(result.endsWith("hls/v%v/playlist.m3u8"));
});

test("samplePoints stays inside the runtime and is ordered", () => {
  const duration = 1000;
  const points = samplePoints(duration, 10);

  assert.equal(points.length, 10);
  assert.ok(points[0] > 0, "first sample skips the opening logo");
  assert.ok(points.at(-1) < duration, "last sample skips the credits");
  for (let i = 1; i < points.length; i++) {
    assert.ok(points[i] > points[i - 1], "samples advance along the timeline");
  }
});

test("normaliseLanguage maps container tags to what HTML wants", () => {
  // Containers carry ISO 639-2; <track srclang> and player menus want 639-1.
  assert.deepEqual(normaliseLanguage("eng"), { code: "en", name: "English" });
  assert.deepEqual(normaliseLanguage("jpn"), { code: "ja", name: "Japanese" });
  // Both bibliographic and terminological German codes resolve the same way.
  assert.equal(normaliseLanguage("ger").code, "de");
  assert.equal(normaliseLanguage("deu").code, "de");
  // An untagged track is honest about being unknown rather than guessing.
  assert.deepEqual(normaliseLanguage("und"), { code: "und", name: "Unknown" });
  assert.deepEqual(normaliseLanguage(""), { code: "und", name: "Unknown" });
  // Unmapped codes still yield something a player can use.
  assert.equal(normaliseLanguage("swe").code, "sw");
});

test("trackLabel prefers the embedded title, then the language", () => {
  assert.equal(trackLabel({ title: "Signs & Songs", language: "eng", index: 0 }), "Signs & Songs");
  assert.equal(trackLabel({ language: "eng", index: 0 }), "English");
  assert.equal(trackLabel({ language: "eng", forced: true, index: 0 }), "English (forced)");
  // No tag at all still produces a distinguishable menu entry.
  assert.equal(trackLabel({ index: 2 }), "Track 3");
});

test("cdnUrl tolerates a CloudFront domain that already carries a scheme", () => {
  // The AWS console shows the distribution with https:// on the front, so that
  // is what gets pasted into an environment file. Prefixing a second one
  // produced https://https://…, which no player fetches — and because the URL
  // is written to the database on a successful upload, the failure only
  // surfaced later, at playback, on a title that reported success.
  const expected = "https://d1nb9xnp3todvf.cloudfront.net/movie/1/master.m3u8";
  const key = "movie/1/master.m3u8";

  assert.equal(cdnUrl("d1nb9xnp3todvf.cloudfront.net", key), expected);
  assert.equal(cdnUrl("https://d1nb9xnp3todvf.cloudfront.net", key), expected);
  assert.equal(cdnUrl("http://d1nb9xnp3todvf.cloudfront.net", key), expected);
  assert.equal(cdnUrl("https://d1nb9xnp3todvf.cloudfront.net/", key), expected);
  assert.equal(cdnUrl("  https://d1nb9xnp3todvf.cloudfront.net  ", key), expected);
});

test("buildStreamArgs keeps every audio language as a selectable rendition", () => {
  const renditions = ladderFor(1080);
  const audio = [
    { index: 0, code: "ja", name: "Japanese", label: "Japanese", default: false },
    { index: 1, code: "hi", name: "Hindi", label: "Hindi", default: true },
  ];

  const { maps, streamMap } = buildStreamArgs(renditions, audio, 48);

  // The bug this replaces: a hardcoded `-map a:0` muxed the first track into
  // every rung and discarded the second language entirely, so a dual-audio
  // release played Japanese-only with no way to switch.
  assert.deepEqual(
    maps.filter((arg) => arg.startsWith("0:a:")),
    ["0:a:0", "0:a:1"]
  );

  const variants = streamMap.split(" ");
  assert.equal(variants.length, renditions.length + audio.length);

  // Every variant has to join the group, or the master playlist never links
  // the video rungs to the alternate audio and the menu stays empty.
  assert.ok(
    variants.every((variant) => variant.includes("agroup:audio")),
    streamMap
  );

  // The source's own default wins. Nothing here may prefer a language: the
  // same pipeline ingests Japanese-first and Hindi-first releases.
  assert.deepEqual(
    variants.filter((variant) => variant.includes("default:yes")),
    ["a:1,agroup:audio,name:Hindi,language:hi,default:yes"]
  );

  // Names double as output directory names, so a collision would have one
  // track's segments overwrite another's.
  const names = variants.map((variant) => variant.match(/name:([^,]+)/)[1]);
  assert.equal(new Set(names).size, names.length, `duplicate variant name in ${streamMap}`);
});

test("labelAudioRenditions replaces ffmpeg's placeholder names", () => {
  // Verbatim ffmpeg output. NAME is hardcoded to audio_<n> by the muxer, and it
  // is the string a player shows in its language menu — "audio_1" tells a
  // viewer nothing about which track is Hindi.
  const master = [
    "#EXTM3U",
    "#EXT-X-VERSION:6",
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="group_audio",NAME="audio_1",DEFAULT=NO,LANGUAGE="ja",URI="Japanese/playlist.m3u8"',
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="group_audio",NAME="audio_2",DEFAULT=YES,LANGUAGE="hi",URI="Hindi/playlist.m3u8"',
    '#EXT-X-STREAM-INF:BANDWIDTH=1680800,RESOLUTION=854x480,CODECS="avc1.64001e,mp4a.40.2",AUDIO="group_audio"',
    "480p/playlist.m3u8",
  ].join("\n");

  const result = labelAudioRenditions(
    master,
    new Map([
      ["Japanese/playlist.m3u8", 'Japanese "original"'],
      ["Hindi/playlist.m3u8", "Hindi"],
    ])
  );

  // A quote in the label would close the attribute early and corrupt the line.
  assert.ok(result.includes('NAME="Japanese original"'), result);
  assert.ok(result.includes('NAME="Hindi"'), result);
  assert.ok(!result.includes("audio_1"), "placeholder left behind");
  assert.ok(!result.includes("audio_2"), "placeholder left behind");

  // Everything else on those lines, and the variant lines, are untouched.
  assert.ok(result.includes('DEFAULT=YES,LANGUAGE="hi"'));
  assert.equal(result.split("\n").length, master.split("\n").length);
  assert.ok(result.includes('CODECS="avc1.64001e,mp4a.40.2",AUDIO="group_audio"'));
});

test("buildStreamArgs omits the audio group when the source is silent", () => {
  // An agroup pointing at no audio rendition makes the master playlist invalid.
  const { maps, streamMap } = buildStreamArgs(ladderFor(720), [], 48);
  assert.ok(!streamMap.includes("agroup"), streamMap);
  assert.ok(!maps.some((arg) => arg.startsWith("0:a:")));
});

test("buildStreamArgs distinguishes two tracks sharing one language", () => {
  const { streamMap } = buildStreamArgs(
    ladderFor(480),
    [
      { index: 0, code: "ja", name: "Japanese", label: "Japanese", default: true },
      { index: 1, code: "ja", name: "Japanese", label: "Commentary", default: false },
    ],
    48
  );

  assert.ok(streamMap.includes("name:Japanese,"), streamMap);
  assert.ok(streamMap.includes("name:Japanese-2,"), streamMap);
});

test("extractSubtitles skips bitmap tracks instead of failing the ingest", async () => {
  // PGS and VOBSUB cues are images; converting them needs OCR, not a remux.
  const { tracks, skipped } = await extractSubtitles("unused.mkv", "unused-dir", [
    { index: 0, codec: "hdmv_pgs_subtitle", text: false, code: "en", label: "English" },
    { index: 1, codec: "dvd_subtitle", text: false, code: "ja", label: "Japanese" },
  ]);

  assert.equal(tracks.length, 0, "nothing extracted");
  assert.equal(skipped.length, 2, "both reported");
  assert.match(skipped[0].reason, /bitmap/);
  assert.match(skipped[1].reason, /OCR/);
});

test("extractSubtitles does nothing when the source has no subtitle streams", async () => {
  const { tracks, skipped } = await extractSubtitles("unused.mkv", "unused-dir", []);
  assert.deepEqual(tracks, []);
  assert.deepEqual(skipped, []);
});
