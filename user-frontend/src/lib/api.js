// Data access for the viewer app.
// Uses the user-backend API when NEXT_PUBLIC_API_URL is set; otherwise falls
// back to bundled demo data so the UI renders locally with no backend.

const API = process.env.NEXT_PUBLIC_API_URL; // e.g. https://<api-id>.execute-api.<region>.amazonaws.com/api/v1

const demo = async () => {
  const res = await fetch("/streamingContents.json", { cache: "no-store" });
  const json = await res.json();
  return json.data || [];
};

export async function getContents() {
  if (API) {
    try {
      const res = await fetch(`${API}/contents`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.length) return json.data;
      }
    } catch {
      /* fall through to demo */
    }
  }
  return demo();
}

export async function searchContents(q) {
  const query = (q || "").trim();
  if (!query) return [];
  if (API) {
    try {
      const res = await fetch(`${API}/search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
    } catch {
      /* fall through */
    }
  }
  const all = await demo();
  const needle = query.toLowerCase();
  return all.filter(
    (c) =>
      c.title?.toLowerCase().includes(needle) ||
      (c.genres || []).some((g) => g.toLowerCase().includes(needle)) ||
      (c.tags || []).some((t) => t.toLowerCase().includes(needle))
  );
}

export async function getContentByVideoId(videoId) {
  const all = await getContents();
  return (
    all.find((c) => String(c.video_id) === String(videoId)) ||
    all.find((c) => String(c.id || c._id) === String(videoId)) ||
    null
  );
}

// Group content into rows by genre for the browse page.
export function groupByGenre(items, max = 6) {
  const rows = {};
  for (const item of items) {
    for (const genre of item.genres || ["Featured"]) {
      (rows[genre] ||= []).push(item);
    }
  }
  return Object.entries(rows)
    .filter(([, list]) => list.length > 0)
    .slice(0, max)
    .map(([genre, list]) => ({ genre, list }));
}
