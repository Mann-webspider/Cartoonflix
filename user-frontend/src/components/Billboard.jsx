"use client";

import Link from "next/link";
import { contentId, formatRuntime, totalEpisodes } from "@/lib/api";
import { PlayIcon } from "@/components/Icons";
import MyListButton from "@/components/MyListButton";

/**
 * The opening viewport: one title at full width, its artwork carrying the page
 * and the copy sitting in the quiet left third.
 *
 * The scrim is two gradients rather than one — vertical to seat the artwork on
 * the page, horizontal to hold contrast under the text — because a single
 * overlay dark enough for the copy kills the image everywhere else.
 */
export default function Billboard({ item }) {
  if (!item) return null;

  const id = contentId(item);
  const art = item.poster_url || item.thumbnail_url;
  const episodes = totalEpisodes(item);
  const runtime = formatRuntime(item.duration_seconds);
  const year = item.release_date?.slice(0, 4) || item.releaseDate?.slice(0, 4);

  const facts = [
    item.type === "series" ? "Series" : "Film",
    year,
    item.type === "series"
      ? episodes && `${episodes} episode${episodes === 1 ? "" : "s"}`
      : runtime,
    item.genres?.[0],
  ].filter(Boolean);

  return (
    <section className="relative isolate min-h-[78vh] w-full overflow-hidden sm:min-h-[86vh]">
      {art ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={art}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-brand/45 via-surface to-ink" />
      )}

      <div className="billboard-scrim absolute inset-0" />

      <div className="relative flex min-h-[78vh] flex-col justify-end px-5 pb-14 pt-28 sm:min-h-[86vh] sm:px-8 sm:pb-20 lg:px-14 lg:pb-24">
        <div className="max-w-2xl">
          <h1 className="font-display text-[clamp(2.5rem,7vw,5rem)] leading-[0.92]">
            {item.title}
          </h1>

          {facts.length > 0 && (
            <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-dim tabular">
              {facts.map((fact, index) => (
                <span key={fact} className="flex items-center gap-3">
                  {index > 0 && <span aria-hidden="true" className="text-dim/70">·</span>}
                  {fact}
                </span>
              ))}
            </p>
          )}

          {item.description && (
            <p className="mt-5 line-clamp-3 max-w-prose text-[0.975rem] leading-relaxed text-dim">
              {item.description}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={`/watch/${id}`}
              className="inline-flex items-center gap-2.5 rounded bg-text px-7 py-3.5 font-display text-[0.95rem] font-bold text-ink transition duration-200 ease-out hover:bg-white"
            >
              <PlayIcon size={18} />
              Play
            </Link>
            <Link
              href={`/title/${id}`}
              className="inline-flex items-center gap-2 rounded border border-line-strong bg-ink/50 px-6 py-3.5 font-display text-[0.95rem] font-bold backdrop-blur transition duration-200 ease-out hover:bg-surface-2"
            >
              More info
            </Link>
            <MyListButton id={id} />
          </div>
        </div>
      </div>
    </section>
  );
}
