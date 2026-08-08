/**
 * TMDB lookup, normalised for this app's content shape.
 *
 * TMDB rather than IMDb: IMDb publishes no public API and its terms forbid
 * scraping. TMDB permits this use, carries the IMDb id so titles can still be
 * linked out, and covers animation well.
 *
 * Movie and TV responses are deliberately flattened into ONE shape, so the
 * admin form and the content model never have to branch on which endpoint the
 * data came from.
 */

/**
 * TMDB serves the same API from two hostnames. `api.tmdb.org` is the default
 * here rather than the more familiar `api.themoviedb.org` because several ISPs
 * — Indian ones especially — reset TLS connections to the latter by hostname.
 * Measured on the machine this was written on: api.themoviedb.org failed 7 of
 * 10 attempts with ECONNRESET while api.tmdb.org succeeded 10 of 10.
 *
 * Override with TMDB_API_HOST if your network prefers the other one.
 */
const API_HOST = process.env.TMDB_API_HOST || 'https://api.tmdb.org';
const API = `${API_HOST.replace(/\/+$/, '')}/3`;
const IMAGE = 'https://image.tmdb.org/t/p';

/** A hung lookup should fail fast, not hold the admin form open. */
const REQUEST_TIMEOUT_MS = 12000;
const MAX_ATTEMPTS = 3;

// Certification bodies are per-country; prefer the operator's region and fall
// back to US, which is the most consistently populated.
const REGION = process.env.TMDB_REGION || 'IN';
const FALLBACK_REGION = 'US';

const imageUrl = (path, size) => (path ? `${IMAGE}/${size}${path}` : undefined);

class TmdbError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/**
 * Network faults worth trying again. A reset connection says nothing about the
 * request, so repeating it is reasonable; a rejected API key does not improve
 * with repetition, which is why 4xx responses are never retried.
 */
const TRANSIENT_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EAI_AGAIN', 'ENOTFOUND']);

const isTransient = (err) => {
  if (err.name === 'AbortError' || err.name === 'TimeoutError') return true;
  // undici wraps the real cause; the code lives one level down.
  const code = err.cause?.code || err.code;
  return TRANSIENT_CODES.has(code) || err instanceof TypeError;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const requestOnce = async (url) => {
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (res.status === 401) throw new TmdbError('TMDB rejected the API key', 502);
  if (res.status === 404) throw new TmdbError('Not found on TMDB', 404);
  if (res.status === 429) throw new TmdbError('TMDB rate limit reached — wait a moment', 429);
  // 5xx is TMDB having a bad moment, so let the caller retry it.
  if (res.status >= 500) {
    const err = new Error(`TMDB returned ${res.status}`);
    err.code = 'ETIMEDOUT';
    throw err;
  }
  if (!res.ok) throw new TmdbError(`TMDB request failed (${res.status})`, 502);

  return res.json();
};

const request = async (path, params = {}) => {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new TmdbError('TMDB_API_KEY is not set — add it to admin-backend/.env', 503);
  }

  const url = new URL(`${API}${path}`);
  url.searchParams.set('api_key', key);
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(name, value);
    }
  }

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await requestOnce(url);
    } catch (err) {
      // A definite answer from TMDB — bad key, no such title — is final.
      if (err instanceof TmdbError) throw err;
      if (!isTransient(err)) throw err;

      lastError = err;
      if (attempt < MAX_ATTEMPTS) await sleep(250 * attempt);
    }
  }

  // Name the actual cause. "Metadata lookup failed" sent someone hunting
  // through application code for what was an ISP resetting the connection.
  const cause = lastError?.cause?.code || lastError?.code || lastError?.message;
  throw new TmdbError(
    `Could not reach TMDB (${cause}). Tried ${MAX_ATTEMPTS} times via ${new URL(API).host}. ` +
      `If this persists, some ISPs reset api.themoviedb.org — set TMDB_API_HOST to the other host.`,
    504
  );
};

/**
 * Search for a title. Returns enough to disambiguate — the operator picks the
 * right match rather than the first result being assumed correct, because
 * animated series in particular have many near-identical entries.
 */
const search = async (query, { type = 'movie', year } = {}) => {
  const isSeries = type === 'series';
  const data = await request(isSeries ? '/search/tv' : '/search/movie', {
    query,
    include_adult: 'false',
    ...(isSeries ? { first_air_date_year: year } : { year }),
  });

  return (data.results || []).slice(0, 10).map((result) => ({
    tmdb_id: result.id,
    type,
    title: isSeries ? result.name : result.title,
    original_title: isSeries ? result.original_name : result.original_title,
    release_date: isSeries ? result.first_air_date : result.release_date,
    description: result.overview,
    poster_url: imageUrl(result.poster_path, 'original'),
    backdrop_url: imageUrl(result.backdrop_path, 'original'),
    tmdb_score: result.vote_average,
  }));
};

const certificationFor = (details, isSeries) => {
  if (isSeries) {
    const ratings = details.content_ratings?.results || [];
    const match =
      ratings.find((r) => r.iso_3166_1 === REGION) ||
      ratings.find((r) => r.iso_3166_1 === FALLBACK_REGION);
    return match?.rating || undefined;
  }

  const releases = details.release_dates?.results || [];
  const match =
    releases.find((r) => r.iso_3166_1 === REGION) ||
    releases.find((r) => r.iso_3166_1 === FALLBACK_REGION);
  return match?.release_dates?.find((entry) => entry.certification)?.certification || undefined;
};

const peopleWithJob = (crew, job) =>
  (crew || []).filter((member) => member.job === job).map((member) => member.name);

/**
 * Full metadata for one title, shaped to drop straight into the content form.
 * Season numbers only are returned for a series — episode lists are fetched
 * per season, so pulling a 20-season show does not make 20 requests up front.
 */
const details = async (type, tmdbId) => {
  const isSeries = type === 'series';
  const data = await request(isSeries ? `/tv/${tmdbId}` : `/movie/${tmdbId}`, {
    append_to_response: isSeries ? 'credits,content_ratings,external_ids' : 'credits,release_dates',
  });

  const crew = data.credits?.crew || [];

  return {
    tmdb_id: data.id,
    // Movies carry imdb_id directly; series keep it under external_ids.
    imdb_id: data.imdb_id || data.external_ids?.imdb_id || undefined,
    type,
    title: isSeries ? data.name : data.title,
    original_title: isSeries ? data.original_name : data.original_title,
    tagline: data.tagline || undefined,
    description: data.overview,
    releaseDate: isSeries ? data.first_air_date : data.release_date,
    genres: (data.genres || []).map((genre) => genre.name),
    runtime_minutes: isSeries ? data.episode_run_time?.[0] : data.runtime,
    certification: certificationFor(data, isSeries),
    languages: (data.spoken_languages || []).map((language) => ({
      code: language.iso_639_1,
      name: language.english_name || language.name,
    })),
    studios: (data.production_companies || []).map((company) => company.name),
    directors: isSeries
      ? (data.created_by || []).map((person) => person.name)
      : peopleWithJob(crew, 'Director'),
    writers: peopleWithJob(crew, 'Writer').concat(peopleWithJob(crew, 'Screenplay')),
    cast: (data.credits?.cast || []).slice(0, 20).map((person) => ({
      name: person.name,
      character: person.character,
      profile_url: imageUrl(person.profile_path, 'w185'),
      order: person.order,
    })),
    tmdb_score: data.vote_average,
    tmdb_votes: data.vote_count,
    poster_url: imageUrl(data.poster_path, 'w500'),
    backdrop_url: imageUrl(data.backdrop_path, 'w1280'),
    seasons: isSeries
      ? (data.seasons || [])
          // Season 0 is TMDB's "Specials" bucket; it is rarely what an operator
          // means by season one, so it is offered last rather than first.
          .sort((a, b) => (a.season_number || 99) - (b.season_number || 99))
          .map((season) => ({
            season_number: season.season_number,
            title: season.name,
            description: season.overview,
            air_date: season.air_date,
            poster_url: imageUrl(season.poster_path, 'w342'),
            episode_count: season.episode_count,
          }))
      : undefined,
  };
};

/** Episode list for one season, ready to seed the series before any transcode. */
const seasonEpisodes = async (tmdbId, seasonNumber) => {
  const data = await request(`/tv/${tmdbId}/season/${seasonNumber}`);
  return {
    season_number: data.season_number,
    title: data.name,
    description: data.overview,
    air_date: data.air_date,
    poster_url: imageUrl(data.poster_path, 'w342'),
    episodes: (data.episodes || []).map((episode) => ({
      episode_number: episode.episode_number,
      title: episode.name,
      description: episode.overview,
      air_date: episode.air_date,
      thumbnail_url: imageUrl(episode.still_path, 'w300'),
      duration_seconds: episode.runtime ? episode.runtime * 60 : undefined,
    })),
  };
};

module.exports = { search, details, seasonEpisodes, TmdbError };
