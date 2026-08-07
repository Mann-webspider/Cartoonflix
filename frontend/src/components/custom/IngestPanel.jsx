"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ProgressBar from "@/components/custom/ProgressBar";
import {
  uploadSource,
  startIngest,
  getIngestStatus,
  publishIngest,
  thumbnailUrl,
} from "@/api/ingest";

const POLL_INTERVAL_MS = 1500;

const STAGE_LABELS = {
  probe: "Reading source",
  transcode: "Transcoding to HLS",
  thumbnails: "Extracting stills",
};

/**
 * Drives one item through the local pipeline: upload to this machine,
 * transcode to a 480p/720p/1080p HLS ladder, pick a poster from the extracted
 * stills, then publish the finished output to S3.
 *
 * Movies publish under their content id. Episodes take a season and episode
 * number and publish beneath the same series, so a series is ingested one
 * episode at a time.
 */
export default function IngestPanel({ contentId, contentType }) {
  const isSeries = contentType === "series";
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [file, setFile] = useState(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [busy, setBusy] = useState(null); // "upload" | "publish" | null
  const [job, setJob] = useState(null);
  const [poster, setPoster] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const { toast } = useToast();

  const coords = isSeries ? { season, episode } : {};
  const coordsKey = isSeries ? `${season}-${episode}` : "movie";
  const isRunning = job?.status === "running";
  const stills = job?.status === "done" ? job.manifest?.thumbnails || [] : [];

  const failed = useCallback(
    (error, fallback) => {
      toast({
        title: error?.response?.data?.error || error?.message || fallback,
        variant: "destructive",
      });
    },
    [toast]
  );

  // Switching episodes must not show the previous episode's job or stills.
  useEffect(() => {
    setJob(null);
    setPoster(null);
    setThumbnail(null);
    setUploadPercent(0);
  }, [coordsKey, contentId]);

  // Pick up an existing job for this item, including one finished before the
  // page was opened — the server recovers those from the manifest on disk.
  const refresh = useCallback(async () => {
    if (!contentId) return null;
    try {
      const current = await getIngestStatus(contentId, coords);
      setJob(current);
      return current;
    } catch {
      return null; // a missing job is not an error worth interrupting the admin for
    }
  }, [contentId, coordsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll only while a transcode is actually in flight.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => refreshRef.current(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isRunning]);

  const handleUploadAndTranscode = async () => {
    if (!contentId) return toast({ title: "Save the details first.", variant: "destructive" });
    if (!file) return toast({ title: "Choose a video file.", variant: "destructive" });

    setBusy("upload");
    setUploadPercent(0);
    try {
      await uploadSource(contentId, file, coords, setUploadPercent);
      setJob(await startIngest(contentId, coords));
      toast({ title: "Transcode started", description: "Progress updates below." });
    } catch (error) {
      failed(error, "Upload failed");
    } finally {
      setBusy(null);
    }
  };

  const handlePublish = async () => {
    if (!poster) return toast({ title: "Pick a poster still.", variant: "destructive" });

    setBusy("publish");
    try {
      const result = await publishIngest(contentId, coords, {
        poster,
        thumbnail: thumbnail || poster,
      });
      toast({ title: "Published", description: result.videoUrl });
    } catch (error) {
      failed(error, "Publish failed");
    } finally {
      setBusy(null);
    }
  };

  if (!contentId) {
    return (
      <p className="text-sm text-muted-foreground">
        Generate a Movie Id and save the details to enable the media pipeline.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {isSeries && (
        <div className="flex gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="season">Season</Label>
            <Input
              id="season"
              type="number"
              min={1}
              className="w-24"
              value={season}
              onChange={(e) => setSeason(Number(e.target.value) || 1)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="episode">Episode</Label>
            <Input
              id="episode"
              type="number"
              min={1}
              className="w-24"
              value={episode}
              onChange={(e) => setEpisode(Number(e.target.value) || 1)}
            />
          </div>
        </div>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="source">Source video</Label>
        <div className="flex gap-1.5">
          <Input
            id="source"
            type="file"
            accept="video/*,.mkv,.m4v"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <Button type="button" onClick={handleUploadAndTranscode} disabled={busy || isRunning}>
            {busy === "upload" ? "Uploading…" : "Transcode"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Stays on this machine until you publish. Produces 480p/720p/1080p HLS.
        </p>
      </div>

      {busy === "upload" && (
        <div className="grid gap-1.5">
          <Label>Uploading to local server</Label>
          <ProgressBar progress={uploadPercent} />
        </div>
      )}

      {isRunning && (
        <div className="grid gap-1.5">
          <Label>{STAGE_LABELS[job.stage] || "Processing"}</Label>
          <ProgressBar progress={job.percent ?? 0} />
        </div>
      )}

      {job?.status === "failed" && (
        <p className="text-sm text-destructive whitespace-pre-wrap">Transcode failed: {job.error}</p>
      )}

      {stills.length > 0 && (
        <div className="flex flex-col gap-3">
          <div>
            <Label>Stills</Label>
            <p className="text-xs text-muted-foreground">
              Click to set the poster. Shift-click to set the card thumbnail.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {stills.map((still) => {
              const isPoster = poster === still;
              const isThumbnail = thumbnail === still;
              return (
                <button
                  key={still}
                  type="button"
                  onClick={(e) => (e.shiftKey ? setThumbnail(still) : setPoster(still))}
                  className={`relative overflow-hidden rounded border-2 transition ${
                    isPoster
                      ? "border-primary"
                      : isThumbnail
                        ? "border-sky-500"
                        : "border-transparent hover:border-muted-foreground"
                  }`}
                >
                  {/* Local disk, not a remote asset — next/image would add a
                      loader and a config allowlist for no benefit here. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnailUrl(contentId, coords, still)}
                    alt={`Still ${still}`}
                    className="aspect-video w-full object-cover"
                  />
                  {(isPoster || isThumbnail) && (
                    <span className="absolute bottom-0 left-0 right-0 bg-black/70 py-0.5 text-[10px] uppercase tracking-wide text-white">
                      {isPoster ? "poster" : "thumbnail"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" onClick={handlePublish} disabled={busy || !poster}>
              {busy === "publish" ? "Uploading to S3…" : "Publish to S3"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {job.manifest?.hls?.renditions?.join(" · ")} ·{" "}
              {job.manifest?.hls?.segmentSeconds}s segments
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
