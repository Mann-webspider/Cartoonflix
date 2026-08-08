"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { updateContent, uploadArtwork, type Content } from "@/lib/api";

interface Props {
  content: Content;
  onChange: (content: Content) => void;
}

const runtimeLabel = (content: Content) => {
  const seconds = content.duration_seconds;
  if (seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
  }
  return content.runtime_minutes ? `${content.runtime_minutes}m` : null;
};

/**
 * The title as viewers will meet it, rendered from what is actually saved.
 *
 * This is the check the admin form cannot give on its own: metadata reads
 * fine in a form and badly on a billboard, and a poster chosen from a grid of
 * thumbnails often turns out wrong at full width. Artwork can be replaced from
 * here without going back through the pipeline.
 */
export default function PreviewPane({ content, onChange }: Props) {
  const [uploading, setUploading] = useState<"poster" | "thumbnail" | null>(null);
  const posterInput = useRef<HTMLInputElement>(null);
  const thumbInput = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const replaceArtwork = async (file: File | undefined, kind: "poster" | "thumbnail") => {
    if (!file) return;
    setUploading(kind);
    try {
      const publicUrl = await uploadArtwork(content._id, file, kind);
      const { content: updated } = await updateContent(content._id, {
        [kind === "poster" ? "poster_url" : "thumbnail_url"]: publicUrl,
      });
      onChange(updated);
      toast({ title: `${kind === "poster" ? "Poster" : "Card image"} replaced` });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const art = content.backdrop_url || content.poster_url || content.thumbnail_url;
  const runtime = runtimeLabel(content);
  const episodes = (content.seasons ?? []).reduce((n, s) => n + s.episodes.length, 0);
  const readyEpisodes = (content.seasons ?? []).reduce(
    (n, s) => n + s.episodes.filter((e) => e.status === "ready").length,
    0
  );

  const facts = [
    content.type === "series" ? "Series" : "Film",
    content.releaseDate?.slice(0, 4),
    content.type === "series"
      ? episodes
        ? `${episodes} episode${episodes === 1 ? "" : "s"}`
        : null
      : runtime,
    content.certification,
    content.languages?.map((l) => l.name).join(", "),
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Preview</h2>
        <p className="text-sm text-muted-foreground">
          Rendered from what is saved, not from unsaved form fields.
        </p>
      </div>

      {/* Approximates the viewer's dark billboard so artwork and copy are
          judged in the conditions they actually ship in. */}
      <div className="overflow-hidden rounded-lg border">
        <div className="relative isolate min-h-[22rem] bg-[#0b0a0f]">
          {art ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={art} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#3d21b8]/40 via-[#141219] to-[#0b0a0f]" />
          )}

          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, #0b0a0f 4%, rgba(11,10,15,.55) 45%, transparent 78%), linear-gradient(to right, #0b0a0f 2%, rgba(11,10,15,.82) 32%, transparent 68%)",
            }}
          />

          <div className="relative flex min-h-[22rem] flex-col justify-end p-8">
            <div className="max-w-xl text-[#f6f4fa]">
              <h3 className="text-4xl font-black leading-[0.95] tracking-tight">
                {content.title || "Untitled"}
              </h3>
              {content.tagline && (
                <p className="mt-2 text-sm italic text-[#a29bb4]">{content.tagline}</p>
              )}
              {facts.length > 0 && (
                <p className="mt-4 text-sm text-[#a29bb4]">{facts.join(" · ")}</p>
              )}
              {content.description && (
                <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-[#a29bb4]">
                  {content.description}
                </p>
              )}
              <div className="mt-6 flex flex-wrap gap-2">
                {(content.genres ?? []).slice(0, 5).map((genre) => (
                  <span
                    key={genre}
                    className="rounded border border-white/20 px-2 py-0.5 text-xs text-[#f6f4fa]"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant={content.isPublish ? "default" : "outline"}>
          {content.isPublish ? "Published" : "Not published"}
        </Badge>
        <Badge variant={content.status === "ready" ? "secondary" : "outline"}>
          {content.status === "ready" ? "Media ready" : `Media ${content.status ?? "pending"}`}
        </Badge>
        {content.type === "series" && (
          <Badge variant="outline">
            {readyEpisodes}/{episodes} episodes transcoded
          </Badge>
        )}
        {content.tmdb_score ? (
          <Badge variant="outline">TMDB {content.tmdb_score.toFixed(1)}</Badge>
        ) : null}
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-semibold">Artwork</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Replace either without re-running the transcode.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <ArtworkSlot
            label="Poster"
            hint="Billboard and detail page"
            url={content.poster_url}
            uploading={uploading === "poster"}
            inputRef={posterInput}
            onPick={(file) => replaceArtwork(file, "poster")}
          />
          <ArtworkSlot
            label="Card image"
            hint="Browse rails"
            url={content.thumbnail_url}
            uploading={uploading === "thumbnail"}
            inputRef={thumbInput}
            onPick={(file) => replaceArtwork(file, "thumbnail")}
          />
        </div>
      </div>
    </div>
  );
}

function ArtworkSlot({
  label,
  hint,
  url,
  uploading,
  inputRef,
  onPick,
}: {
  label: string;
  hint: string;
  url?: string;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
  onPick: (file: File | undefined) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>

      <div className="aspect-video overflow-hidden rounded-md border bg-muted">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            None set
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => onPick(event.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="mr-2 h-3.5 w-3.5" />
        )}
        Replace {label.toLowerCase()}
      </Button>
    </div>
  );
}
