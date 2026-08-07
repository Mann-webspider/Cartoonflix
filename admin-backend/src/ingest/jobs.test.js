const test = require("node:test");
const assert = require("node:assert/strict");
const { slugFor } = require("./jobs");
const { upsertEpisode } = require("../controllers/ingestController");

test("slugFor matches the key ffmpeg-service writes on disk", () => {
  // These two implementations must agree: this one addresses the job, the one
  // in ffmpeg-service/src/pipeline.js names the directory and the S3 prefix.
  assert.equal(slugFor({ contentId: "abc" }), "abc");
  assert.equal(slugFor({ contentId: "abc", season: 2, episode: 11 }), "abc/s2e11");
  assert.equal(slugFor({ contentId: "abc", season: 1 }), "abc");
});

test("upsertEpisode inserts, replaces, and keeps seasons ordered", () => {
  const content = { seasons: [] };

  upsertEpisode(content, 2, 1, { video_url: "s2e1" });
  upsertEpisode(content, 1, 2, { video_url: "s1e2" });
  upsertEpisode(content, 1, 1, { video_url: "s1e1" });

  assert.deepEqual(
    content.seasons.map((s) => s.season_number),
    [1, 2]
  );
  assert.deepEqual(
    content.seasons[0].episodes.map((e) => e.episode_number),
    [1, 2]
  );

  // Re-publishing an episode updates it in place instead of duplicating it.
  upsertEpisode(content, 1, 2, { video_url: "s1e2-v2", title: "Renamed" });
  assert.equal(content.seasons[0].episodes.length, 2);
  assert.equal(content.seasons[0].episodes[1].video_url, "s1e2-v2");
  assert.equal(content.seasons[0].episodes[1].title, "Renamed");
});
