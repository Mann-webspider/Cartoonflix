// Admin API base. Set NEXT_PUBLIC_ADMIN_API_URL per environment.
// Local default matches the admin-backend dev server.
export const API_BASE =
  process.env.NEXT_PUBLIC_ADMIN_API_URL || "http://localhost:4000/api/v1/admin";

// Origin of the same server, used for the stills it serves off local disk
// during ingest (`/media/<slug>/thumbs/...`).
export const MEDIA_BASE = API_BASE.replace(/\/api\/v1\/admin\/?$/, "");

export const TOKEN_COOKIE = "cf_admin_token";
export const USER_COOKIE = "cf_admin_user";
