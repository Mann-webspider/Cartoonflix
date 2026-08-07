"use client";

import { useState } from "react";
import Link from "next/link";
import { formatRuntime } from "@/lib/api";
import { PlayIcon } from "@/components/Icons";

/**
 * Seasons and their episodes.
 *
 * A season picker only earns its place once there is more than one season, so
 * a single-season series shows its episodes directly rather than behind a
 * control with one option.
 */
export default function EpisodeList({ contentId, seasons }) {
  const ordered = [...(seasons || [])].sort((a, b) => a.season_number - b.season_number);
  const [selected, setSelected] = useState(ordered[0]?.season_number);

  if (!ordered.length) return null;

  const season = ordered.find((s) => s.season_number === selected) || ordered[0];

  return (
    <section className="px-5 py-12 sm:px-8 lg:px-14">
      <div className="mb-6 flex flex-wrap items-baseline gap-x-6 gap-y-3">
        <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">Episodes</h2>

        {ordered.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {ordered.map((option) => (
              <button
                key={option.season_number}
                type="button"
                onClick={() => setSelected(option.season_number)}
                aria-pressed={option.season_number === season.season_number}
                className={`rounded border px-3.5 py-1.5 text-sm transition duration-200 ease-out ${
                  option.season_number === season.season_number
                    ? "border-brand bg-brand text-brand-ink"
                    : "border-line text-dim hover:border-line-strong hover:text-text"
                }`}
              >
                Season {option.season_number}
              </button>
            ))}
          </div>
        )}
      </div>

      <ol className="divide-y divide-line border-y border-line">
        {season.episodes?.map((episode) => (
          <li key={episode.episode_number}>
            <Link
              href={`/watch/${contentId}?s=${season.season_number}&e=${episode.episode_number}`}
              className="group flex items-center gap-4 py-4 transition-colors duration-200 hover:bg-surface/60 sm:gap-6"
            >
              <span className="w-8 shrink-0 text-center font-display text-lg text-dim tabular transition-colors duration-200 group-hover:text-text">
                {episode.episode_number}
              </span>

              <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded bg-surface-2 sm:w-44">
                {episode.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={episode.thumbnail_url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-ink/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <PlayIcon size={22} />
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-base font-bold">
                  {episode.title || `Episode ${episode.episode_number}`}
                </h3>
                {episode.description && (
                  <p className="mt-1 line-clamp-2 max-w-prose text-sm leading-relaxed text-dim">
                    {episode.description}
                  </p>
                )}
              </div>

              <span className="hidden shrink-0 text-sm text-dim tabular sm:block">
                {formatRuntime(episode.duration_seconds)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
