import test from "node:test";
import assert from "node:assert/strict";
import { slugFor } from "./pipeline.js";
import { ladderFor, LADDER, ffmpegPath } from "./transcode/hls.js";
import { samplePoints } from "./transcode/thumbnails.js";
import { normaliseLanguage, subtitleLabel } from "./transcode/probe.js";
import { extractSubtitles } from "./transcode/subtitles.js";

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

test("subtitleLabel prefers the embedded title, then the language", () => {
  assert.equal(subtitleLabel({ title: "Signs & Songs", language: "eng", index: 0 }), "Signs & Songs");
  assert.equal(subtitleLabel({ language: "eng", index: 0 }), "English");
  assert.equal(subtitleLabel({ language: "eng", forced: true, index: 0 }), "English (forced)");
  // No tag at all still produces a distinguishable menu entry.
  assert.equal(subtitleLabel({ index: 2 }), "Track 3");
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
