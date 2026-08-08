"use client";

import Link from "next/link";
import { contentId, formatRuntime, totalEpisodes } from "@/lib/api";
import { PlayIcon } from "@/components/Icons";

/**
 * One title in a rail: 16:9 artwork with its name set below, not over it.
 *
 * The stills this catalogue produces are widescreen frames pulled from the
 * source, so a 2:3 poster crop would cut them apart. Metadata sits under the
 * card in the same rhythm at every state, which keeps the row from reflowing
 * when a card takes focus.
 */
export default function TitleCard({ item, progress }) {
  const id = contentId(item);
  const art = item.thumbnail_url || item.poster_url;
  const episodes = totalEpisodes(item);
  const runtime = formatRuntime(item.duration_seconds);

  const meta =
    item.type === "series"
      ? episodes
        ? `${episodes} episode${episodes === 1 ? "" : "s"}`
        : "Series"
      : runtime || "Film";

  return (
    <Link href={`/title/${id}`} className="group block w-[16.5rem] shrink-0 sm:w-[19rem]">
      <div className="relative aspect-video overflow-hidden rounded bg-surface ring-1 ring-line transition duration-300 ease-out group-hover:ring-line-strong group-focus-visible:ring-2 group-focus-visible:ring-text">
        {art ? (
          // Artwork is served straight from CloudFront; Next's optimizer would
          // bill per transform for images that are already sized correctly.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={art}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-lg text-dim">
            {item.title}
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/50 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="flex h-12 w-12 scale-90 items-center justify-center rounded-full bg-text text-contrast-ink transition-transform duration-300 ease-spring group-hover:scale-100">
            <PlayIcon size={20} />
          </span>
        </div>

        {progress > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-text/25">
            <div
              className="h-full bg-text"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        )}
      </div>

      <div className="mt-3">
        <h3 className="font-display-tight truncate text-[0.95rem] font-bold">{item.title}</h3>
        <p className="mt-0.5 truncate text-[0.8rem] text-dim tabular">{meta}</p>
      </div>
    </Link>
  );
}
