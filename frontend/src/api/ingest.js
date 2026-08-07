"use client";
import axios from "axios";
import { getCookie } from "cookies-next";
import { API_BASE, MEDIA_BASE, TOKEN_COOKIE } from "@/lib/config";

/**
 * Client for the local ingest pipeline.
 *
 * Unlike the rest of the admin API, these endpoints only exist while
 * admin-backend runs on this machine: the video never leaves localhost until
 * the explicit publish step uploads the finished HLS output to S3.
 */

const authHeader = () => {
  const token = getCookie(TOKEN_COOKIE);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** Episode coordinates, omitted entirely for movies. */
const episodeParams = ({ season, episode } = {}) =>
  season && episode ? { season, episode } : {};

export const slugFor = (contentId, { season, episode } = {}) =>
  season && episode ? `${contentId}/s${season}e${episode}` : String(contentId);

/** URL of a still the local server is serving off disk. */
export const thumbnailUrl = (contentId, coords, fileName) =>
  `${MEDIA_BASE}/media/${slugFor(contentId, coords)}/thumbs/${fileName}`;

/** Stream a source file to the local server. Never hits the network. */
export const uploadSource = async (contentId, file, coords, onProgress) => {
  const { data } = await axios.put(`${API_BASE}/ingest/${contentId}/source`, file, {
    params: { filename: file.name, ...episodeParams(coords) },
    headers: { ...authHeader(), "Content-Type": file.type || "application/octet-stream" },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });
  return data;
};

export const startIngest = async (contentId, coords, thumbnails) => {
  const { data } = await axios.post(
    `${API_BASE}/ingest/${contentId}/start`,
    { ...episodeParams(coords), thumbnails },
    { headers: authHeader() }
  );
  return data.job;
};

export const getIngestStatus = async (contentId, coords) => {
  const { data } = await axios.get(`${API_BASE}/ingest/${contentId}`, {
    params: episodeParams(coords),
    headers: authHeader(),
  });
  return data.job;
};

export const publishIngest = async (contentId, coords, selection) => {
  const { data } = await axios.post(
    `${API_BASE}/ingest/${contentId}/publish`,
    { ...episodeParams(coords), ...selection },
    { headers: authHeader() }
  );
  return data;
};
