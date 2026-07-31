"use client";
import axios from "axios";
import { getCookie } from "cookies-next";
import { generateMovieId } from "@/lib/generateCode.js";
import { API_BASE, TOKEN_COOKIE } from "@/lib/config";

const authHeaders = () => {
  const token = getCookie(TOKEN_COOKIE);
  return {
    "Content-type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Idempotent create/update of content metadata (must exist before the movie is
// uploaded, so the transcode-completion handler can find the doc).
export const saveMetadata = async (meta) => {
  const body = {
    _id: meta._id,
    title: meta.title,
    description: meta.description,
    type: meta.type,
    releaseDate: meta.releaseDate,
    genres: meta.genres || [],
    tags: meta.tags || [],
    video_id: meta.video_id || generateMovieId(meta.title, meta.type),
    isPublish: !!meta.isPublish,
    deleted: !!meta.deleted,
  };
  const { data } = await axios.post(`${API_BASE}/content`, body, { headers: authHeaders() });
  return data;
};

// Presign + upload one asset. kind "video" -> raw bucket (triggers transcode);
// kind "image" -> public poster path. Returns { key, publicUrl }.
export const uploadAsset = async (contentId, file, kind, setProgress) => {
  const { data } = await axios.post(
    `${API_BASE}/presigned-url`,
    { contentId, fileName: file.name, fileType: file.type, kind },
    { headers: authHeaders() }
  );
  await axios.put(data.uploadUrl, file, {
    headers: { "Content-Type": file.type },
    onUploadProgress: (e) => {
      if (setProgress && e.total) setProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return { key: data.key, publicUrl: data.publicUrl };
};

export const updateContent = async (id, patch) => {
  const { data } = await axios.put(`${API_BASE}/content/${id}`, patch, { headers: authHeaders() });
  return data;
};

// Edit-form submit: update metadata + flags.
export const handleMovieUpdate = async (formEvent, genre, tag) => {
  const t = formEvent.target;
  const id = t["id"].value;
  return updateContent(id, {
    title: t["title"].value,
    description: t["description"].value,
    type: t["type"].value,
    releaseDate: t["date"].value,
    genres: genre,
    tags: tag,
    isPublish: t["isPublish"].checked,
    deleted: t["isDeleted"].checked,
  });
};
