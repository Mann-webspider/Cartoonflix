/**
 * Viewer API client.
 *
 * Every request goes to the Go Lambda behind API Gateway — it is the only thing
 * that talks to MongoDB. When NEXT_PUBLIC_API_URL is unset the catalogue falls
 * back to bundled sample data so the app still renders with no backend running.
 */

const API = process.env.NEXT_PUBLIC_API_URL; // https://<id>.execute-api.<region>.amazonaws.com/api/v1

const TOKEN_KEY = "cf_token";

export const getToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);

const authHeaders = () => {
  const token = getToken();
  return token ? { authorization: `Bearer ${token}` } : {};
};

/** Throws with the API's own message so callers can show it verbatim. */
const request = async (path, options = {}) => {
  const res = await fetch(`${API}${path}`, {
    cache: "no-store",
    ...options,
    headers: { "content-type": "application/json", ...authHeaders(), ...options.headers },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
};

/**
 * Demonstration titles, used only when no API is configured at all.
 *
 * This must never stand in for a failed request: showing sample titles to
 * someone whose library did not load presents fiction as their own content,
 * and hides the outage behind a page that looks like it worked.
 */
const sampleCatalogue = async () => {
  const res = await fetch("/streamingContents.json", { cache: "no-store" });
  const json = await res.json();
  return json.data || [];
};

/** True when the app is running on demonstration data. */
export const isSampleMode = () => !API;

/** Normalise the two id shapes the API and the sample data use. */
export const contentId = (item) => String(item?.id ?? item?._id ?? "");

export async function getContents() {
  if (!API) return sampleCatalogue();
  const { data } = await request("/contents");
  return data || [];
}

export async function getContent(id) {
  if (!API) {
    const all = await sampleCatalogue();
    return (
      all.find((item) => contentId(item) === String(id)) ||
      all.find((item) => String(item.video_id) === String(id)) ||
      null
    );
  }

  try {
    const { data } = await request(`/contents/${encodeURIComponent(id)}`);
    return data || null;
  } catch (err) {
    // A 404 is an answer, not a failure — the title is gone.
    if (/404/.test(err.message) || /not found/i.test(err.message)) return null;
    throw err;
  }
}

export async function searchContents(query) {
  const q = (query || "").trim();
  if (!q) return [];

  if (API) {
    const { data } = await request(`/search?q=${encodeURIComponent(q)}`);
    return data || [];
  }

  const needle = q.toLowerCase();
  const all = await sampleCatalogue();
  return all.filter(
    (item) =>
      item.title?.toLowerCase().includes(needle) ||
      (item.genres || []).some((g) => g.toLowerCase().includes(needle)) ||
      (item.tags || []).some((t) => t.toLowerCase().includes(needle))
  );
}

// --- Personalisation. All of these require a signed-in viewer. ---

export async function getContinueWatching() {
  if (!API || !getToken()) return [];
  try {
    const { data } = await request("/me/continue");
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Record where the viewer stopped. Called on an interval during playback, so
 * failures are swallowed — a dropped progress ping is not worth an error
 * message over the video.
 */
export async function saveProgress({ id, season, episode, position, duration }) {
  if (!API || !getToken() || !duration) return;
  try {
    await request("/me/progress", {
      method: "PUT",
      body: JSON.stringify({
        content_id: id,
        season: season || 0,
        episode: episode || 0,
        position_seconds: Math.floor(position),
        duration_seconds: Math.floor(duration),
      }),
    });
  } catch {
    /* best effort */
  }
}

// --- Social ---

/**
 * Likes and rating summary for one title, plus this viewer's own state when
 * they are signed in. One request rather than three, because the title page
 * needs all of it at once.
 */
export async function getSocial(id) {
  if (!API) return null;
  try {
    return await request(`/contents/${encodeURIComponent(id)}/social`);
  } catch {
    return null; // social is an enhancement; its absence must not break the page
  }
}

export async function toggleLike(id) {
  return request(`/contents/${encodeURIComponent(id)}/like`, { method: "POST" });
}

export async function getReviews(id) {
  if (!API) return { data: [], average: 0, count: 0 };
  return request(`/contents/${encodeURIComponent(id)}/reviews`);
}

export async function saveReview(id, { rating, body }) {
  return request(`/contents/${encodeURIComponent(id)}/reviews`, {
    method: "POST",
    body: JSON.stringify({ rating, body }),
  });
}

export async function deleteReview(id) {
  return request(`/contents/${encodeURIComponent(id)}/reviews`, { method: "DELETE" });
}

const MY_LIST = "watchlist";

export async function getMyList() {
  if (!API || !getToken()) return [];
  try {
    const { data } = await request("/preferences");
    return data?.find((p) => p.type === MY_LIST)?.items || [];
  } catch {
    return [];
  }
}

export async function saveMyList(items) {
  if (!API || !getToken()) return;
  await request("/preferences", {
    method: "POST",
    body: JSON.stringify({ type: MY_LIST, items }),
  });
}

// --- Shaping helpers used by the browse page ---

const OVERFLOW_RAIL = "More from the library";

/**
 * Group the catalogue into browse rails.
 *
 * Each title lands in exactly one rail, chosen as its *rarest* genre. Putting
 * a title in every genre it carries sounds richer but is not: catalogues like
 * this tag almost everything "Animation, Comedy, Family", so the naive grouping
 * produces eight rails holding the same titles in the same order. The rarest
 * genre is the one that actually distinguishes a title from its neighbours.
 *
 * Rails too small to be worth a heading collapse into one overflow rail rather
 * than leaving a row with two cards and a lot of empty gutter.
 */
export function railsByGenre(items, { maxRails = 8, minPerRail = 3, ubiquitous = 0.6 } = {}) {
  const frequency = new Map();
  for (const item of items) {
    for (const genre of item.genres || []) {
      frequency.set(genre, (frequency.get(genre) || 0) + 1);
    }
  }

  // A genre on most of the catalogue tells the viewer nothing — "Animation" is
  // on every title in a cartoon library, so it is a heading with no meaning.
  // Ignore those when choosing a home rail; a title left with none falls to
  // the overflow rail rather than under a label that does not distinguish it.
  const ceiling = items.length * ubiquitous;
  const distinctive = (genre) => (frequency.get(genre) || 0) <= ceiling;

  const homeRail = (item) =>
    (item.genres || [])
      .filter(distinctive)
      .sort((a, b) => frequency.get(a) - frequency.get(b) || a.localeCompare(b))[0] ||
    OVERFLOW_RAIL;

  const byRail = new Map();
  for (const item of items) {
    const rail = homeRail(item);
    if (!byRail.has(rail)) byRail.set(rail, []);
    byRail.get(rail).push(item);
  }

  const overflow = [];
  const rails = [];
  for (const [title, list] of byRail) {
    if (title === OVERFLOW_RAIL || list.length < minPerRail) overflow.push(...list);
    else rails.push({ title, items: list });
  }

  rails.sort((a, b) => b.items.length - a.items.length);

  // A single leftover title does not need a heading of its own; fold it into
  // the last real rail instead of shipping a one-card row.
  if (overflow.length === 1 && rails.length) rails[0].items.push(overflow[0]);
  else if (overflow.length) rails.push({ title: OVERFLOW_RAIL, items: overflow });

  return rails.slice(0, maxRails);
}

/**
 * The billboard needs artwork to fill a viewport, so prefer a title that has
 * some — a stretched 300px thumbnail is worse than a different title.
 */
export function pickBillboard(items) {
  return items.find((item) => item.poster_url || item.thumbnail_url) || items[0] || null;
}

export const totalEpisodes = (item) =>
  (item?.seasons || []).reduce((sum, season) => sum + (season.episodes?.length || 0), 0);

export const formatRuntime = (seconds) => {
  if (!seconds) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
};
