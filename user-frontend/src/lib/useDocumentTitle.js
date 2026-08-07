"use client";

import { useEffect } from "react";

/**
 * Set the browser tab and accessible page title from client-rendered content.
 *
 * These routes are client components because the catalogue is fetched with the
 * viewer's token, so Next's `metadata` export is unavailable to them — without
 * this every page announces itself as "Cartoonflix".
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · Cartoonflix`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
