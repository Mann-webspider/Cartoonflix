import test from "node:test";
import assert from "node:assert/strict";
import { slugFor } from "./pipeline.js";
import { ladderFor, LADDER, ffmpegPath } from "./transcode/hls.js";
import { samplePoints } from "./transcode/thumbnails.js";

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
  // Below the lowest rung, still emit one valid rendition.
  assert.deepEqual(
    ladderFor(240).map((r) => r.name),
    [LADDER[0].name]
  );
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
