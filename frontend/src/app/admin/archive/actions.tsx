"use server";

import { API_BASE } from "@/lib/config";

export const getArchiveMovies = async (): Promise<{ data: any[] }> => {
  try {
    const res = await fetch(`${API_BASE}/content?archive=true`, { cache: "no-store" });
    if (!res.ok) return { data: [] };
    const json = await res.json();
    return { data: json.content || [] };
  } catch {
    return { data: [] };
  }
};
