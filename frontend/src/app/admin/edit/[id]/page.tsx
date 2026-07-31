"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getContentById, updateContent, type Content } from "@/lib/adminApi";

const field = "rounded-lg border border-input bg-background px-4 py-2.5 focus:border-ring";

export default function EditContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<Content | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getContentById(id).then(setData);
  }, [id]);

  if (!data) return <div className="text-muted-foreground">Loading…</div>;

  const set = (patch: Partial<Content>) => setData({ ...data, ...patch });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await updateContent(id, {
        title: data.title,
        description: data.description,
        type: data.type,
        genres: data.genres,
        tags: data.tags,
        isPublish: data.isPublish,
      });
      router.push("/admin");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Edit content</h1>
      <form onSubmit={save} className="flex flex-col gap-4">
        <input value={data.title || ""} onChange={(e) => set({ title: e.target.value })} className={field} placeholder="Title" />
        <textarea rows={4} value={data.description || ""} onChange={(e) => set({ description: e.target.value })} className={field} placeholder="Description" />
        <select value={data.type || "movie"} onChange={(e) => set({ type: e.target.value })} className={field}>
          <option value="movie">Movie</option>
          <option value="series">Series</option>
        </select>
        <input
          value={(data.genres || []).join(", ")}
          onChange={(e) => set({ genres: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
          className={field}
          placeholder="Genres"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!data.isPublish} onChange={(e) => set({ isPublish: e.target.checked })} />
          Published
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <button disabled={busy} className="mt-2 self-start rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
