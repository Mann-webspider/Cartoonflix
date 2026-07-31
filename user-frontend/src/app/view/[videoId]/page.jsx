"use client";

import { use, useEffect, useState } from "react";
import Player from "@/components/Player";
import { getContentByVideoId } from "@/lib/api";

export default function ViewPage({ params }) {
  const { videoId } = use(params);
  const [movie, setMovie] = useState(undefined);

  useEffect(() => {
    getContentByVideoId(videoId).then(setMovie);
  }, [videoId]);

  if (movie === undefined) {
    return <div className="flex h-[60vh] items-center justify-center text-muted">Loading…</div>;
  }
  if (!movie) {
    return <div className="flex h-[60vh] items-center justify-center text-muted">Content not found.</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Player src={movie.video_url} videoId={videoId} />

      <div className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight">{movie.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          {(movie.genres || []).map((g) => (
            <span key={g} className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs text-muted">
              {g}
            </span>
          ))}
        </div>
        <p className="mt-4 max-w-3xl leading-relaxed text-muted">{movie.description}</p>
        <p className="mt-4 text-sm text-muted">
          Type: <span className="text-text capitalize">{movie.type}</span>
        </p>
      </div>
    </div>
  );
}
