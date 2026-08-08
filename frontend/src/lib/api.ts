"use client";

import { getCookie } from "cookies-next";
import { API_BASE, MEDIA_BASE, TOKEN_COOKIE } from "@/lib/config";

/**
 * The admin API client.
 *
 * One place that knows how to talk to the server, so components deal in
 * content and jobs rather than URLs and headers. Errors carry the server's own
 * message — the API says what went wrong far better than a generic string can.
 */

export type ContentType = "movie" | "series";

export interface CastMember {
  name: string;
  character?: string;
  profile_url?: string;
  order?: number;
}

export interface Episode {
  episode_number: number;
  title?: string;
  description?: string;
  air_date?: string;
  video_url?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  status?: "pending" | "processing" | "ready";
}

export interface Season {
  season_number: number;
  title?: string;
  description?: string;
  poster_url?: string;
  air_date?: string;
  episodes: Episode[];
}

export interface Content {
  _id: string;
  title: string;
  original_title?: string;
  tagline?: string;
  description: string;
  genres: string[];
  tags: string[];
  type: ContentType;
  releaseDate?: string;
  cast?: CastMember[];
  directors?: string[];
  writers?: string[];
  studios?: string[];
  languages?: { code: string; name: string }[];
  certification?: string;
  tmdb_score?: number;
  tmdb_votes?: number;
  tmdb_id?: number;
  imdb_id?: string;
  runtime_minutes?: number;
  video_id?: number;
  video_url?: string;
  duration_seconds?: number;
  thumbnail_url?: string;
  poster_url?: string;
  backdrop_url?: string;
  deleted?: boolean;
  isReady?: boolean;
  isPublish?: boolean;
  status?: "pending" | "processing" | "ready";
  seasons?: Season[];
}

export interface IngestJob {
  slug: string;
  status: "running" | "done" | "failed";
  stage?: string;
  percent?: number;
  error?: string | null;
  manifest?: {
    thumbnails: string[];
    subtitles?: { file: string; language: string; label: string; source: string }[];
    // Bitmap tracks the pipeline could not convert, with the reason.
    skippedSubtitles?: { codec: string; label: string; reason: string }[];
    hls: { renditions: string[]; segmentSeconds: number };
    source: { durationSec: number; width: number; height: number };
  } | null;
}

const authHeaders = (): Record<string, string> => {
  const token = getCookie(TOKEN_COOKIE);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init.headers as Record<string, string>),
    },
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || `Request failed (${res.status})`);
  return payload as T;
}

// --- Content ---

export const listContent = (archived = false) =>
  request<{ content: Content[] }>(`/content?archive=${archived}`).then((r) => r.content);

export const getContent = (id: string) =>
  request<{ content: Content }>(`/content/${id}`).then((r) => r.content);

/** Idempotent create-or-update. The document must exist before ingest runs. */
export const saveContent = (content: Partial<Content> & { _id: string }) =>
  request<{ id: string; content: Content }>("/content", {
    method: "POST",
    body: JSON.stringify(content),
  });

export const updateContent = (id: string, patch: Partial<Content>) =>
  request<{ content: Content }>(`/content/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });

export const deleteContent = (id: string) =>
  request<{ message: string }>(`/content/${id}`, { method: "DELETE" });

/** Merges — an already-transcoded episode keeps its video. */
export const saveSeason = (id: string, season: Partial<Season>) =>
  request<{ content: Content }>(`/content/${id}/season`, {
    method: "POST",
    body: JSON.stringify(season),
  });

export const deleteSeason = (id: string, seasonNumber: number) =>
  request<{ content: Content }>(`/content/${id}/season/${seasonNumber}`, { method: "DELETE" });

// --- TMDB lookup ---

export interface TmdbSearchResult {
  tmdb_id: number;
  type: ContentType;
  title: string;
  original_title?: string;
  release_date?: string;
  description?: string;
  poster_url?: string;
  tmdb_score?: number;
}

export const searchTmdb = (query: string, type: ContentType, year?: string) =>
  request<{ results: TmdbSearchResult[] }>(
    `/tmdb/search?q=${encodeURIComponent(query)}&type=${type}${year ? `&year=${year}` : ""}`
  ).then((r) => r.results);

export const getTmdbDetails = (type: ContentType, tmdbId: number) =>
  request<{ data: Partial<Content> & { seasons?: (Season & { episode_count: number })[] } }>(
    `/tmdb/${type}/${tmdbId}`
  ).then((r) => r.data);

export const getTmdbSeason = (tmdbId: number, seasonNumber: number) =>
  request<{ data: Season }>(`/tmdb/series/${tmdbId}/season/${seasonNumber}`).then((r) => r.data);

// --- Local ingest ---

const episodeParams = (coords?: { season?: number; episode?: number }) =>
  coords?.season && coords?.episode ? `season=${coords.season}&episode=${coords.episode}` : "";

export const slugFor = (id: string, coords?: { season?: number; episode?: number }) =>
  coords?.season && coords?.episode ? `${id}/s${coords.season}e${coords.episode}` : id;

export const thumbnailUrl = (
  id: string,
  coords: { season?: number; episode?: number } | undefined,
  fileName: string
) => `${MEDIA_BASE}/media/${slugFor(id, coords)}/thumbs/${fileName}`;

/**
 * Stream a source file to the local server.
 *
 * XHR rather than fetch: upload progress has no fetch equivalent, and a
 * multi-gigabyte source with no progress bar looks indistinguishable from a
 * hang.
 */
export const uploadSource = (
  id: string,
  file: File,
  coords: { season?: number; episode?: number } | undefined,
  onProgress: (percent: number) => void
) =>
  new Promise<void>((resolve, reject) => {
    const query = new URLSearchParams({ filename: file.name });
    const extra = episodeParams(coords);
    const url = `${API_BASE}/ingest/${id}/source?${query}${extra ? `&${extra}` : ""}`;

    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    const token = getCookie(TOKEN_COOKIE);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(safeError(xhr.responseText) || `Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Upload failed — is the admin server running?"));
    xhr.send(file);
  });

const safeError = (body: string) => {
  try {
    return JSON.parse(body).error as string;
  } catch {
    return null;
  }
};

/**
 * Upload a sidecar subtitle file. Converted to WebVTT server-side and added to
 * the job's manifest, so the next publish uploads it with everything else.
 */
export const uploadSubtitle = async (
  id: string,
  file: File,
  coords: { season?: number; episode?: number } | undefined,
  meta: { language: string; label?: string }
) => {
  const query = new URLSearchParams({ filename: file.name, language: meta.language });
  if (meta.label) query.set("label", meta.label);
  const extra = episodeParams(coords);

  const res = await fetch(
    `${API_BASE}/ingest/${id}/subtitle?${query}${extra ? `&${extra}` : ""}`,
    {
      method: "PUT",
      headers: { "Content-Type": "text/plain", ...authHeaders() },
      body: file,
    }
  );

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload.error || `Subtitle upload failed (${res.status})`);
  return payload.track as { language: string; label: string; file: string };
};

export const startIngest = (
  id: string,
  coords?: { season?: number; episode?: number },
  thumbnails?: number
) =>
  request<{ job: IngestJob }>(`/ingest/${id}/start`, {
    method: "POST",
    body: JSON.stringify({ ...coords, thumbnails }),
  }).then((r) => r.job);

export const getIngestStatus = (id: string, coords?: { season?: number; episode?: number }) => {
  const query = episodeParams(coords);
  return request<{ job: IngestJob | null }>(`/ingest/${id}${query ? `?${query}` : ""}`).then(
    (r) => r.job
  );
};

export const publishIngest = (
  id: string,
  coords: { season?: number; episode?: number } | undefined,
  selection: { poster?: string; thumbnail?: string; title?: string; description?: string }
) =>
  request<{ content: Content; videoUrl: string }>(`/ingest/${id}/publish`, {
    method: "POST",
    body: JSON.stringify({ ...coords, ...selection }),
  });

// --- Artwork uploaded by hand, bypassing the pipeline's extracted stills ---

export const uploadArtwork = async (id: string, file: File, kind: "poster" | "thumbnail") => {
  const { uploadUrl, publicUrl } = await request<{ uploadUrl: string; publicUrl: string }>(
    "/presigned-url",
    {
      method: "POST",
      body: JSON.stringify({
        contentId: id,
        fileName: `${kind}-${Date.now()}-${file.name}`,
        fileType: file.type,
        kind: "image",
      }),
    }
  );

  const put = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!put.ok) throw new Error(`Artwork upload failed (${put.status})`);

  return publicUrl;
};
