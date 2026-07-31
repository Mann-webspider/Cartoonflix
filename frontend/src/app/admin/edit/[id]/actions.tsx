"use server";

import { API_BASE } from "@/lib/config";

export const getMovieEdit = async (id: string): Promise<{ data?: any; error?: string }> => {
  try {
    const res = await fetch(`${API_BASE}/content/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Not found");
    const json = await res.json();
    return { data: json.content };
  } catch (error: any) {
    return { data: {}, error: String(error) };
  }
};
