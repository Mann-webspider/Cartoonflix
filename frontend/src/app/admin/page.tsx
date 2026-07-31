"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Pencil } from "lucide-react";
import { getContents, deleteContent, type Content } from "@/lib/adminApi";

const statusStyles: Record<string, string> = {
  ready: "bg-success/15 text-[hsl(145_45%_60%)] border-[hsl(145_45%_30%)]",
  processing: "bg-primary/15 text-primary border-primary/40",
  pending: "bg-secondary text-muted-foreground border-border",
  failed: "bg-destructive/15 text-[hsl(0_70%_70%)] border-destructive/40",
};

function StatusBadge({ status }: { status?: string }) {
  const s = status || "pending";
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs capitalize ${statusStyles[s] || statusStyles.pending}`}>
      {s}
    </span>
  );
}

export default function Overview() {
  const [items, setItems] = useState<Content[] | null>(null);

  const load = () => getContents().then(setItems).catch(() => setItems([]));
  useEffect(() => {
    load();
  }, []);

  const onDelete = async (id: string) => {
    if (!confirm("Archive this content?")) return;
    await deleteContent(id);
    load();
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Content</h1>
          <p className="text-sm text-muted-foreground">Manage movies and series.</p>
        </div>
        <Link
          href="/admin/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus size={16} /> Add content
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Published</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items === null ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Loading…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No content yet.</td>
              </tr>
            ) : (
              items.map((c) => {
                const id = (c._id || c.id) as string;
                return (
                  <tr key={id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                    <td className="px-4 py-3 font-medium">{c.title}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{c.type}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{c.isPublish ? "Yes" : "No"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3">
                        <Link href={`/admin/edit/${id}`} className="text-muted-foreground hover:text-foreground" aria-label="Edit">
                          <Pencil size={16} />
                        </Link>
                        <button onClick={() => onDelete(id)} className="text-muted-foreground hover:text-destructive" aria-label="Archive">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
