"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createContent, presignUpload, uploadToS3 } from "@/lib/adminApi";

const field = "rounded-lg border border-input bg-background px-4 py-2.5 focus:border-ring";

export default function NewContent() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("movie");
  const [genres, setGenres] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      setStatus("Creating content…");
      const { id } = await createContent({
        title,
        description,
        type,
        genres: genres.split(",").map((s) => s.trim()).filter(Boolean),
        tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      });

      if (file) {
        setStatus("Requesting upload URL…");
        const { uploadUrl } = await presignUpload(id, file);
        setStatus("Uploading video… transcoding starts automatically.");
        await uploadToS3(uploadUrl, file);
      }

      setStatus("Done.");
      router.push("/admin");
    } catch (err) {
      setError((err as Error).message);
      setStatus("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Add content</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Metadata is saved first; uploading the video triggers transcoding.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <input required placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
        <textarea placeholder="Description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={field} />
        <select value={type} onChange={(e) => setType(e.target.value)} className={field}>
          <option value="movie">Movie</option>
          <option value="series">Series</option>
        </select>
        <input placeholder="Genres (comma separated)" value={genres} onChange={(e) => setGenres(e.target.value)} className={field} />
        <input placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} className={field} />

        <label className="text-sm text-muted-foreground">Video file (mp4)</label>
        <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className={field} />

        {status && <p className="text-sm text-muted-foreground">{status}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <button disabled={busy} className="mt-2 self-start rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {busy ? "Saving…" : "Create content"}
        </button>
      </form>
    </div>
  );
}
