"use client";

// Admin API client. Talks to the admin-backend (NEXT_PUBLIC_ADMIN_API_URL),
// stores the JWT locally, and falls back to demo data for the content list so
// the dashboard renders locally without a backend.

const BASE =
  process.env.NEXT_PUBLIC_ADMIN_API_URL || "http://localhost:4000/api/v1/admin";

const TOKEN_KEY = "cf_admin_token";
const USER_KEY = "cf_admin_user";

export type Content = {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  genres?: string[];
  tags?: string[];
  type?: string;
  status?: string;
  isPublish?: boolean;
  video_url?: string;
  poster_url?: string;
  thumbnail_url?: string;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): { name: string; email: string; role: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { authorization: `Bearer ${t}` } : {};
}

async function authRequest(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  localStorage.setItem(TOKEN_KEY, json.token);
  localStorage.setItem(USER_KEY, JSON.stringify(json.user));
  return json;
}

export const login = (email: string, password: string) =>
  authRequest("/auth/login", { email, password });

export const signup = (name: string, email: string, password: string) =>
  authRequest("/auth/signup", { name, email, password });

const DEMO: Content[] = [
  { _id: "demo1", title: "Tom and Jerry: Willy Wonka", type: "movie", status: "ready", isPublish: true, genres: ["Animation", "Family"] },
  { _id: "demo2", title: "Doraemon: Jadooi Tapu", type: "movie", status: "processing", isPublish: false, genres: ["Adventure"] },
  { _id: "demo3", title: "Shin-chan: Bungle in the Jungle", type: "movie", status: "pending", isPublish: false, genres: ["Comedy"] },
];

export async function getContents(): Promise<Content[]> {
  try {
    const res = await fetch(`${BASE}/content?archive=false`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      return json.content || [];
    }
  } catch {
    /* fall through to demo */
  }
  return DEMO;
}

export async function getContentById(id: string): Promise<Content | null> {
  try {
    const res = await fetch(`${BASE}/content/${id}`, { headers: authHeaders(), cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      return json.content || null;
    }
  } catch {
    /* fall through */
  }
  return DEMO.find((d) => d._id === id) || null;
}

export async function updateContent(id: string, body: Partial<Content>) {
  const res = await fetch(`${BASE}/content/${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Update failed");
  return json;
}

export async function deleteContent(id: string) {
  const res = await fetch(`${BASE}/content/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Delete failed");
  return res.json();
}

export async function createContent(body: Partial<Content>) {
  const res = await fetch(`${BASE}/content`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Create failed");
  return json as { id: string; content: Content };
}

export async function presignUpload(contentId: string, file: File) {
  const res = await fetch(`${BASE}/presigned-url`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ contentId, fileName: file.name, fileType: file.type }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Presign failed");
  return json as { uploadUrl: string; key: string };
}

export async function uploadToS3(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "content-type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error("Upload failed");
}
