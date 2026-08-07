"use client";

/**
 * Viewer accounts. These live in the Go Lambda, not the admin API — the admin
 * API only runs on the operator's own machine and is unreachable from here.
 */

const API = process.env.NEXT_PUBLIC_API_URL;

const TOKEN_KEY = "cf_token";
const USER_KEY = "cf_user";

export const getToken = () =>
  typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);

export const getStoredUser = () => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

const authenticate = async (path, body) => {
  if (!API) throw new Error("Sign-in is unavailable — NEXT_PUBLIC_API_URL is not set.");

  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Something went wrong. Try again.");

  localStorage.setItem(TOKEN_KEY, json.token);
  localStorage.setItem(USER_KEY, JSON.stringify(json.user));
  return json.user;
};

/** `identity` is a username or an email — the API accepts either. */
export const login = (identity, password) =>
  authenticate("/auth/login", { email: identity, password });

export const signup = (username, email, password) =>
  authenticate("/auth/signup", { username, email, password });
