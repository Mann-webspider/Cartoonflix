"use client";

import Link from "next/link";
import { contentId, formatRuntime, totalEpisodes } from "@/lib/api";
import { PlayIcon } from "@/components/Icons";
import { Button } from "@/components/ui/button";
import MyListButton from "@/components/MyListButton";

/**
 * The opening viewport: one title at full width, its artwork carrying the page
 * and the copy sitting in the quiet left side.
 *
 * The scrim is two gradients rather than one — vertical to seat the artwork on
 * the page, horizontal to hold contrast under the text — because a single
 * overlay dark enough for the copy kills the image everywhere else.
 */
export default function Billboard({ item }) {
  if (!item) return null;

  const id = contentId(item);
  const art = item.backdrop_url || item.poster_url || item.thumbnail_url;
  const episodes = totalEpisodes(item);
  const runtime = formatRuntime(item.duration_seconds);
  const year = (item.release_date || item.releaseDate || "").slice(0, 4);

  const facts = [
    item.type === "series" ? "Series" : "Film",
    year,
    item.certification,
    item.type === "series"
      ? episodes && `${episodes} episode${episodes === 1 ? "" : "s"}`
      : runtime,
    item.genres?.[0],
  ].filter(Boolean);

  return (
    <section className="relative isolate min-h-[82vh] w-full overflow-hidden sm:min-h-[88vh]">
      {art ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={art}
          alt=""
          fetchPriority="high"
          // A very slow drift keeps the frame alive without becoming a effect
          // the viewer has to look past.
          className="absolute inset-0 h-full w-full scale-105 object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-surface-2 via-surface to-ink" />
      )}

      <div className="billboard-scrim absolute inset-0" />

      <div className="relative flex min-h-[82vh] flex-col justify-end px-5 pb-16 pt-28 sm:min-h-[88vh] sm:px-8 sm:pb-20 lg:px-14 lg:pb-24">
        <div className="max-w-2xl animate-rise">
          <h1 className="text-[clamp(2.75rem,7.5vw,5.5rem)] leading-[0.88]">{item.title}</h1>

          {item.tagline && (
            <p className="mt-4 text-base text-dim sm:text-lg">{item.tagline}</p>
          )}

          {facts.length > 0 && (
            <p className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-dim tabular">
              {facts.map((fact, index) => (
                <span key={`${fact}-${index}`} className="flex items-center gap-2.5">
                  {index > 0 && (
                    <span aria-hidden="true" className="text-dim/60">
                      ·
                    </span>
                  )}
                  {fact}
                </span>
              ))}
            </p>
          )}

          {item.description && (
            <p className="mt-5 line-clamp-3 max-w-prose leading-relaxed text-dim">
              {item.description}
            </p>
          )}

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href={`/watch/${id}`}>
                <PlayIcon size={18} />
                Play
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={`/title/${id}`}>More info</Link>
            </Button>
            <MyListButton id={id} />
          </div>
        </div>
      </div>
    </section>
  );
}
