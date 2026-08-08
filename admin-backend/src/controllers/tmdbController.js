const tmdb = require('../services/tmdb');

// TMDB failures are upstream failures, not bugs here — pass its own status and
// message through so the admin UI can say what actually went wrong (missing
// key, rate limit, no match) instead of a generic 500.
const handle = (handler) => async (req, res) => {
  try {
    res.json(await handler(req));
  } catch (err) {
    if (err instanceof tmdb.TmdbError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('TMDB lookup failed:', err);
    res.status(500).json({ error: 'Metadata lookup failed' });
  }
};

exports.search = handle(async (req) => {
  const { q, type = 'movie', year } = req.query;
  if (!q) throw new tmdb.TmdbError('A search query is required', 400);
  return { results: await tmdb.search(q, { type, year }) };
});

exports.details = handle(async (req) => {
  const { type, id } = req.params;
  if (type !== 'movie' && type !== 'series') {
    throw new tmdb.TmdbError('type must be movie or series', 400);
  }
  return { data: await tmdb.details(type, id) };
});

exports.season = handle(async (req) => {
  const { id, seasonNumber } = req.params;
  return { data: await tmdb.seasonEpisodes(id, Number(seasonNumber)) };
});
