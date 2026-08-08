const test = require("node:test");
const assert = require("node:assert/strict");
const { mergeSeason } = require("./contentController");

test("mergeSeason seeds a new season from metadata alone", () => {
  const content = { type: "series", seasons: [] };

  mergeSeason(content, {
    season_number: 1,
    title: "Season 1",
    episodes: [
      { episode_number: 2, title: "Second" },
      { episode_number: 1, title: "First" },
    ],
  });

  assert.equal(content.seasons.length, 1);
  assert.equal(content.seasons[0].title, "Season 1");
  assert.deepEqual(
    content.seasons[0].episodes.map((e) => e.episode_number),
    [1, 2]
  );
  // Nothing is playable until it has been transcoded.
  assert.ok(content.seasons[0].episodes.every((e) => e.status === "pending"));
});

test("re-seeding a season never costs a published episode its video", () => {
  // This is the whole reason the endpoint merges instead of replacing: pulling
  // a season from TMDB a second time must not wipe work the pipeline did.
  const content = {
    type: "series",
    seasons: [
      {
        season_number: 1,
        episodes: [
          {
            episode_number: 1,
            title: "Old title",
            video_url: "https://cdn/abc/s1e1/master.m3u8",
            duration_seconds: 1320,
            thumbnail_url: "https://cdn/posters/abc/thumb-s1e1.jpg",
            status: "ready",
          },
        ],
      },
    ],
  };

  mergeSeason(content, {
    season_number: 1,
    episodes: [
      {
        episode_number: 1,
        title: "Corrected title",
        description: "Fresh synopsis",
        thumbnail_url: "https://tmdb/still.jpg",
        duration_seconds: 1300,
      },
      { episode_number: 2, title: "Newly listed" },
    ],
  });

  const [first, second] = content.seasons[0].episodes;

  assert.equal(first.video_url, "https://cdn/abc/s1e1/master.m3u8", "video survived");
  assert.equal(first.status, "ready", "status survived");
  assert.equal(first.duration_seconds, 1320, "measured duration beats TMDB's claim");
  assert.equal(first.thumbnail_url, "https://cdn/posters/abc/thumb-s1e1.jpg", "published still kept");
  assert.equal(first.title, "Corrected title", "descriptive fields still refresh");
  assert.equal(first.description, "Fresh synopsis");

  assert.equal(second.episode_number, 2);
  assert.equal(second.status, "pending");
});

test("mergeSeason keeps seasons ordered", () => {
  const content = { type: "series", seasons: [] };
  mergeSeason(content, { season_number: 3, episodes: [] });
  mergeSeason(content, { season_number: 1, episodes: [] });
  mergeSeason(content, { season_number: 2, episodes: [] });

  assert.deepEqual(
    content.seasons.map((s) => s.season_number),
    [1, 2, 3]
  );
});
