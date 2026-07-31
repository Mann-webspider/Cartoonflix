"use server";

import { API_BASE } from "@/lib/config";

// Public read of active content for the dashboard table.
export const getMoviesMetadata = async () => {
  try {
    const res = await fetch(`${API_BASE}/content?archive=false`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.content || [];
  } catch {
    return [];
  }
};
