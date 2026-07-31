"use client";
import axios from "axios";
import { getCookie } from "cookies-next";
import { API_BASE, TOKEN_COOKIE } from "@/lib/config";

// Soft-delete (archive) a content item. Requires an admin token.
export const deleteSingleItem = async (id) => {
  const token = getCookie(TOKEN_COOKIE);
  const { data } = await axios.delete(`${API_BASE}/content/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return data;
};
