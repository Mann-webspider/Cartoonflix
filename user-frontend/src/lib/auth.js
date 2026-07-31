"use client";

// Minimal auth client. Tokens are minted by the admin API and stored locally.
const ADMIN_API =
  process.env.NEXT_PUBLIC_ADMIN_API_URL || process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "/api/v1/admin");

const TOKEN_KEY = "cf_token";
const USER_KEY = "cf_user";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function authRequest(path, body) {
  if (!ADMIN_API) throw new Error("Auth API not configured (set NEXT_PUBLIC_ADMIN_API_URL)");
  const res = await fetch(`${ADMIN_API}${path}`, {
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

export const login = (email, password) => authRequest("/auth/login", { email, password });
export const signup = (name, email, password) => authRequest("/auth/signup", { name, email, password });
