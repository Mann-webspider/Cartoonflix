"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, UploadCloud, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  getIngestStatus,
  publishIngest,
  startIngest,
  thumbnailUrl,
  uploadSource,
  uploadSubtitle,
  type IngestJob,
} from "@/lib/api";

const POLL_MS = 1500;

const STAGE_LABEL: Record<string, string> = {
  probe: "Reading the source",
  transcode: "Transcoding to HLS",
  thumbnails: "Extracting stills",
};

interface Props {
  contentId: string;
  /** Omitted for a film; both required for an episode. */
  season?: number;
  episode?: number;
  onPublished?: () => void;
}

/**
 * Takes one playable item from a local file to a published HLS stream.
 *
 * The same component serves a film and a single episode — the only difference
 * is whether season and episode coordinates are supplied, which is exactly the
 * distinction the storage slug already makes.
 */
export default function MediaIngest({ contentId, season, episode, onPublished }: Props) {
  const coords = season && episode ? { season, episode } : undefined;
  const coordsKey = coords ? `${season}-${episode}` : "film";

  const [file, setFile] = useState<File | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [busy, setBusy] = useState<"upload" | "publish" | "subtitle" | null>(null);
  const [job, setJob] = useState<IngestJob | null>(null);
  const [poster, setPoster] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const { toast } = useToast();

  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [subtitleLanguage, setSubtitleLanguage] = useState("en");
  const [subtitleLabel, setSubtitleLabel] = useState("");

  const running = job?.status === "running";
  const transcoded = job?.status === "done";
  const stills = transcoded ? (job.manifest?.thumbnails ?? []) : [];
  const tracks = transcoded ? (job.manifest?.subtitles ?? []) : [];
  const skippedTracks = transcoded ? (job.manifest?.skippedSubtitles ?? []) : [];

  const fail = useCallback(
    (err: unknown, fallback: string) =>
      toast({ title: (err as Error)?.message || fallback, variant: "destructive" }),
    [toast]
  );

  // Switching episodes must not leave the previous episode's job on screen.
  useEffect(() => {
    setJob(null);
    setPoster(null);
    setThumbnail(null);
    setUploadPercent(0);
    setFile(null);
  }, [coordsKey, contentId]);

  const refresh = useCallback(async () => {
    try {
      setJob(await getIngestStatus(contentId, coords));
    } catch {
      // A missing job is the normal state before the first transcode.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, coordsKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll only while a transcode is actually in flight.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => refreshRef.current(), POLL_MS);
    return () => clearInterval(timer);
  }, [running]);

  const transcode = async () => {
    if (!file) return toast({ title: "Choose a video file first.", variant: "destructive" });

    setBusy("upload");
    setUploadPercent(0);
    try {
      await uploadSource(contentId, file, coords, setUploadPercent);
      setJob(await startIngest(contentId, coords));
      toast({ title: "Transcode started", description: "Progress appears below." });
    } catch (err) {
      fail(err, "Upload failed");
    } finally {
      setBusy(null);
    }
  };

  const addSubtitle = async () => {
    if (!subtitleFile) return toast({ title: "Choose a subtitle file.", variant: "destructive" });
    if (!subtitleLanguage.trim()) {
      return toast({ title: "Enter a language code, e.g. en.", variant: "destructive" });
    }

    setBusy("subtitle");
    try {
      const track = await uploadSubtitle(contentId, subtitleFile, coords, {
        language: subtitleLanguage.trim(),
        label: subtitleLabel.trim() || undefined,
      });
      setSubtitleFile(null);
      setSubtitleLabel("");
      await refresh();
      toast({ title: `Added ${track.label}`, description: "Publish to upload it." });
    } catch (err) {
      fail(err, "Could not add the subtitle track");
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    if (!poster) return toast({ title: "Pick a still to use.", variant: "destructive" });

    setBusy("publish");
    try {
      const result = await publishIngest(contentId, coords, {
        poster,
        thumbnail: thumbnail ?? poster,
      });
      toast({ title: "Published", description: result.videoUrl });
      onPublished?.();
    } catch (err) {
      fail(err, "Publish failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={`source-${coordsKey}`}>Source video</Label>
        <div className="flex gap-2">
          <Input
            id={`source-${coordsKey}`}
            type="file"
            accept="video/*,.mkv,.m4v"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            disabled={busy !== null || running}
          />
          <Button type="button" onClick={transcode} disabled={busy !== null || running || !file}>
            {busy === "upload" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploadPercent}%
              </>
            ) : (
              <>
                <UploadCloud className="mr-2 h-4 w-4" />
                Transcode
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Stays on this machine until you publish. Produces 480p, 720p and 1080p HLS.
        </p>
      </div>

      {busy === "upload" && <Progress value={uploadPercent} label="Uploading to this machine" />}

      {running && (
        <Progress value={job?.percent ?? 0} label={STAGE_LABEL[job?.stage ?? ""] ?? "Processing"} />
      )}

      {job?.status === "failed" && (
        <p role="alert" className="whitespace-pre-wrap rounded-md border border-destructive/50 p-3 text-sm">
          Transcode failed: {job.error}
        </p>
      )}

      {transcoded && (
        <div className="space-y-3 rounded-md border p-4">
          <div>
            <Label>Subtitles</Label>
            <p className="text-xs text-muted-foreground">
              Text tracks found in the source are converted automatically. Add a
              .srt or .vtt file for sources that carry none.
            </p>
          </div>

          {tracks.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {tracks.map((track) => (
                <li key={track.file}>
                  <Badge variant="secondary">
                    {track.label}
                    {track.source === "uploaded" ? " · uploaded" : ""}
                  </Badge>
                </li>
              ))}
            </ul>
          )}

          {/* Bitmap tracks are named rather than silently dropped — otherwise a
              Blu-ray rip looks like the pipeline simply ignored its subtitles. */}
          {skippedTracks.length > 0 && (
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {skippedTracks.map((track, index) => (
                <li key={index}>
                  Skipped {track.label}: {track.reason}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-end gap-2">
            <Input
              type="file"
              accept=".srt,.vtt,.ass,.ssa,.sub"
              onChange={(event) => setSubtitleFile(event.target.files?.[0] ?? null)}
              className="max-w-[15rem]"
              aria-label="Subtitle file"
            />
            <div className="space-y-1">
              <Label htmlFor={`sub-lang-${coordsKey}`} className="text-xs">
                Language
              </Label>
              <Input
                id={`sub-lang-${coordsKey}`}
                value={subtitleLanguage}
                onChange={(event) => setSubtitleLanguage(event.target.value)}
                className="w-20"
                placeholder="en"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`sub-label-${coordsKey}`} className="text-xs">
                Label (optional)
              </Label>
              <Input
                id={`sub-label-${coordsKey}`}
                value={subtitleLabel}
                onChange={(event) => setSubtitleLabel(event.target.value)}
                className="w-40"
                placeholder="English"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={addSubtitle}
              disabled={busy !== null || !subtitleFile}
            >
              {busy === "subtitle" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add track"}
            </Button>
          </div>
        </div>
      )}

      {stills.length > 0 && (
        <div className="space-y-3">
          <div>
            <Label>Choose artwork</Label>
            <p className="text-xs text-muted-foreground">
              Click a still for the poster. Shift-click for the card image.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {stills.map((still) => {
              const isPoster = poster === still;
              const isThumb = thumbnail === still;
              return (
                <button
                  key={still}
                  type="button"
                  onClick={(event) => (event.shiftKey ? setThumbnail(still) : setPoster(still))}
                  className={`relative overflow-hidden rounded border-2 transition ${
                    isPoster
                      ? "border-primary"
                      : isThumb
                        ? "border-sky-500"
                        : "border-transparent hover:border-muted-foreground"
                  }`}
                >
                  {/* Served off local disk by the admin server during review. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnailUrl(contentId, coords, still)}
                    alt={`Still ${still}`}
                    className="aspect-video w-full object-cover"
                  />
                  {(isPoster || isThumb) && (
                    <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-[10px] uppercase tracking-wide text-white">
                      {isPoster ? "poster" : "card"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={publish} disabled={busy !== null || !poster}>
              {busy === "publish" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading to S3…
                </>
              ) : (
                "Publish to S3"
              )}
            </Button>
            {job?.manifest && (
              <span className="text-xs text-muted-foreground">
                {job.manifest.hls.renditions.join(" · ")} ·{" "}
                {job.manifest.hls.segmentSeconds}s segments ·{" "}
                {job.manifest.source.width}×{job.manifest.source.height}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">{Math.round(value)}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full bg-primary transition-[width] duration-300"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

/** Compact status pill used by the season list. */
export function IngestStatusBadge({ status }: { status?: string }) {
  if (status === "ready") {
    return (
      <Badge variant="secondary" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Ready
      </Badge>
    );
  }
  if (status === "processing") return <Badge variant="secondary">Processing</Badge>;
  return <Badge variant="outline">Not transcoded</Badge>;
}
