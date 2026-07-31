"use client";

import { useEffect, useState } from "react";
import { getContents, type Content } from "@/lib/adminApi";

// Archived (soft-deleted) content. The list endpoint supports ?archive=true;
// here we render whatever the client returns, filtered to archived items.
export default function ArchivePage() {
  const [items, setItems] = useState<Content[] | null>(null);

  useEffect(() => {
    getContents().then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Archive</h1>
      <p className="mb-6 text-sm text-muted-foreground">Soft-deleted content.</p>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {items === null ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">Nothing archived.</td></tr>
            ) : (
              items.map((c) => (
                <tr key={c._id || c.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium">{c.title}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{c.type}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{c.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
