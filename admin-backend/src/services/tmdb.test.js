const test = require("node:test");
const assert = require("node:assert/strict");
const tmdb = require("./tmdb");

const withStubbedFetch = async (payload, run) => {
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url.toString());
    return { ok: true, status: 200, json: async () => payload };
  };
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = realFetch;
  }
};

test("details flattens a movie into the content shape", async () => {
  process.env.TMDB_API_KEY = "test-key";
  process.env.TMDB_REGION = "IN";

  const payload = {
    id: 12345,
    imdb_id: "tt0000001",
    title: "Test Movie",
    original_title: "Test Movie Original",
    overview: "A synopsis.",
    release_date: "1999-04-01",
    runtime: 88,
    genres: [{ name: "Animation" }, { name: "Comedy" }],
    spoken_languages: [{ iso_639_1: "ja", english_name: "Japanese" }],
    production_companies: [{ name: "Studio A" }],
    vote_average: 7.4,
    vote_count: 210,
    poster_path: "/poster.jpg",
    backdrop_path: "/backdrop.jpg",
    credits: {
      crew: [
        { job: "Director", name: "A Director" },
        { job: "Screenplay", name: "A Writer" },
        { job: "Gaffer", name: "Not Included" },
      ],
      cast: [{ name: "An Actor", character: "Someone", profile_path: "/p.jpg", order: 0 }],
    },
    release_dates: {
      results: [
        { iso_3166_1: "US", release_dates: [{ certification: "PG" }] },
        { iso_3166_1: "IN", release_dates: [{ certification: "U" }] },
      ],
    },
  };

  const result = await withStubbedFetch(payload, () => tmdb.details("movie", 12345));

  assert.equal(result.title, "Test Movie");
  assert.equal(result.imdb_id, "tt0000001");
  assert.equal(result.runtime_minutes, 88);
  assert.deepEqual(result.genres, ["Animation", "Comedy"]);
  assert.deepEqual(result.languages, [{ code: "ja", name: "Japanese" }]);
  assert.deepEqual(result.directors, ["A Director"]);
  assert.deepEqual(result.writers, ["A Writer"]);
  assert.equal(result.cast[0].profile_url, "https://image.tmdb.org/t/p/w185/p.jpg");
  assert.equal(result.poster_url, "https://image.tmdb.org/t/p/w500/poster.jpg");
  // The configured region wins over the US fallback.
  assert.equal(result.certification, "U");
  assert.equal(result.seasons, undefined, "a movie has no seasons");
});

test("details flattens a series to the same shape a movie produces", async () => {
  process.env.TMDB_API_KEY = "test-key";

  const payload = {
    id: 999,
    name: "Test Series",
    original_name: "Test Series Original",
    overview: "A series synopsis.",
    first_air_date: "1969-01-01",
    episode_run_time: [24],
    genres: [{ name: "Animation" }],
    spoken_languages: [],
    production_companies: [],
    created_by: [{ name: "A Creator" }],
    credits: { crew: [], cast: [] },
    external_ids: { imdb_id: "tt0000002" },
    content_ratings: { results: [{ iso_3166_1: "US", rating: "TV-G" }] },
    seasons: [
      { season_number: 0, name: "Specials", episode_count: 3 },
      { season_number: 2, name: "Season 2", episode_count: 12 },
      { season_number: 1, name: "Season 1", episode_count: 10 },
    ],
  };

  const result = await withStubbedFetch(payload, () => tmdb.details("series", 999));

  // Series fields land under the same keys a movie uses, so the form never
  // has to branch on which endpoint answered.
  assert.equal(result.title, "Test Series");
  assert.equal(result.releaseDate, "1969-01-01");
  assert.equal(result.runtime_minutes, 24);
  assert.equal(result.imdb_id, "tt0000002");
  assert.deepEqual(result.directors, ["A Creator"]);
  // No IN rating present, so the US fallback answers.
  assert.equal(result.certification, "TV-G");
  // Specials (season 0) sort last, not first.
  assert.deepEqual(
    result.seasons.map((s) => s.season_number),
    [1, 2, 0]
  );
});

test("a missing API key fails loudly rather than silently returning nothing", async () => {
  delete process.env.TMDB_API_KEY;
  await assert.rejects(() => tmdb.search("anything"), /TMDB_API_KEY is not set/);
});
