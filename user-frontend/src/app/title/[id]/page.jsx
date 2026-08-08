"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import EpisodeList from "@/components/EpisodeList";
import MyListButton from "@/components/MyListButton";
import LikeButton from "@/components/LikeButton";
import ShareButton from "@/components/ShareButton";
import Reviews from "@/components/Reviews";
import Rail from "@/components/Rail";
import TitleCard from "@/components/TitleCard";
import { PlayIcon } from "@/components/Icons";
import { Button } from "@/components/ui/button";
import { DetailSkeleton } from "@/components/Skeleton";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import {
  contentId,
  formatRuntime,
  getContent,
  getContents,
  getSocial,
  totalEpisodes,
} from "@/lib/api";

export default function TitlePage({ params }) {
  const { id } = use(params);
  const [item, setItem] = useState(undefined);
  const [failure, setFailure] = useState(null);
  const [related, setRelated] = useState([]);
  const [social, setSocial] = useState(null);

  useDocumentTitle(item?.title);

  useEffect(() => {
    getSocial(id).then(setSocial);
  }, [id]);

  useEffect(() => {
    getContent(id)
      .then(setItem)
      .catch((err) => {
        setFailure(err.message);
        setItem(null);
      });
  }, [id]);

  useEffect(() => {
    if (!item) return;
    getContents()
      .then((all) => {
        const genres = new Set(item.genres || []);
        setRelated(
          all
            .filter((other) => contentId(other) !== contentId(item))
            .filter((other) => (other.genres || []).some((genre) => genres.has(genre)))
            .slice(0, 12)
        );
      })
      .catch(() => setRelated([])); // a missing rail is not worth failing the page
  }, [item]);

  if (item === undefined) return <DetailSkeleton />;

  if (failure) {
    return (
      <div className="flex min-h-[70vh] flex-col justify-center px-5 sm:px-8 lg:px-14">
        <h1 className="font-display text-4xl">This title didn&apos;t load</h1>
        <p className="mt-4 max-w-prose leading-relaxed text-dim">{failure}</p>
        <Link href="/" className="mt-7 w-fit rounded bg-text px-6 py-3 font-display text-sm font-bold text-contrast-ink">
          Back to browse
        </Link>
      </div>
    );
  }

  if (item === null) {
    return (
      <div className="flex min-h-[70vh] flex-col justify-center px-5 sm:px-8 lg:px-14">
        <h1 className="font-display text-4xl">We couldn&apos;t find that title</h1>
        <p className="mt-4 max-w-prose leading-relaxed text-dim">
          It may have been removed from the library.
        </p>
        <Link href="/" className="mt-7 w-fit rounded bg-text px-6 py-3 font-display text-sm font-bold text-contrast-ink">
          Back to browse
        </Link>
      </div>
    );
  }

  const art = item.backdrop_url || item.poster_url || item.thumbnail_url;
  const episodes = totalEpisodes(item);
  const isSeries = item.type === "series";
  const year = (item.release_date || item.releaseDate || "").slice(0, 4);

  const facts = [
    isSeries ? "Series" : "Film",
    year,
    item.certification,
    isSeries
      ? episodes && `${episodes} episode${episodes === 1 ? "" : "s"}`
      : formatRuntime(item.duration_seconds) ||
        (item.runtime_minutes && `${item.runtime_minutes}m`),
    item.tmdb_score ? `${item.tmdb_score.toFixed(1)} on TMDB` : null,
  ].filter(Boolean);

  // Everything TMDB filled in, rendered only where it actually has a value.
  const credits = [
    { label: "Genres", value: item.genres?.join(", ") },
    { label: item.directors?.length === 1 ? "Director" : "Directors", value: item.directors?.join(", ") },
    { label: item.writers?.length === 1 ? "Writer" : "Writers", value: item.writers?.slice(0, 4).join(", ") },
    { label: "Studio", value: item.studios?.slice(0, 3).join(", ") },
    { label: "Languages", value: item.languages?.map((l) => l.name).join(", ") },
    { label: "Tags", value: item.tags?.slice(0, 6).join(", ") },
  ].filter((row) => row.value);

  const firstEpisode = [...(item.seasons || [])].sort(
    (a, b) => a.season_number - b.season_number
  )[0]?.episodes?.[0];

  const watchHref = isSeries && firstEpisode
    ? `/watch/${contentId(item)}?s=${item.seasons[0].season_number}&e=${firstEpisode.episode_number}`
    : `/watch/${contentId(item)}`;

  return (
    <>
      <section className="relative isolate overflow-hidden">
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-surface-2 via-surface to-ink" />
        )}
        <div className="billboard-scrim absolute inset-0" />

        <div className="relative px-5 pb-14 pt-32 sm:px-8 sm:pb-16 sm:pt-40 lg:px-14 lg:pt-48">
          <div className="max-w-4xl">
            <h1 className="font-display w-full text-[clamp(2.25rem,6vw,4.25rem)] leading-[0.94]">
              {item.title}
            </h1>

            <p className="mt-5 flex flex-wrap items-center gap-x-3 text-sm text-dim tabular">
              {facts.map((fact, index) => (
                <span key={fact} className="flex items-center gap-3">
                  {index > 0 && <span aria-hidden="true" className="text-dim/70">·</span>}
                  {fact}
                </span>
              ))}
            </p>

            {item.description && (
              <p className="mt-5 max-w-prose leading-relaxed text-dim">{item.description}</p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href={watchHref}>
                  <PlayIcon size={18} />
                  {isSeries ? "Play episode 1" : "Play"}
                </Link>
              </Button>
              <MyListButton id={contentId(item)} />
              {/* Keyed on the social payload so the initial counts land once
                  fetched, without the button owning the request. */}
              <LikeButton
                key={`like-${social ? "ready" : "pending"}`}
                id={contentId(item)}
                initialLiked={social?.liked ?? false}
                initialCount={social?.likes ?? 0}
              />
              <ShareButton title={item.title} />
            </div>

            {credits.length > 0 && (
              <dl className="mt-10 grid gap-x-10 gap-y-4 border-t border-line pt-6 text-sm sm:grid-cols-2">
                {credits.map((row) => (
                  <div key={row.label}>
                    <dt className="text-dim">{row.label}</dt>
                    <dd className="mt-1">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </section>

      {/* Cast gets its own rail rather than a comma-separated list: faces are
          how people recognise an animated series, and TMDB supplies them. */}
      {item.cast?.length > 0 && (
        <section className="px-5 py-12 sm:px-8 lg:px-14">
          <h2 className="mb-5 text-xl font-bold">Cast</h2>
          <ul className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {item.cast.slice(0, 16).map((person) => (
              <li key={`${person.name}-${person.character}`} className="w-28 shrink-0">
                <div className="aspect-[2/3] overflow-hidden rounded bg-surface">
                  {person.profile_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={person.profile_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-xs text-dim">
                      {person.name}
                    </div>
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-medium">{person.name}</p>
                {person.character && (
                  <p className="truncate text-xs text-dim">{person.character}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isSeries && <EpisodeList contentId={contentId(item)} seasons={item.seasons} />}

      <Reviews contentId={contentId(item)} />

      {related.length > 0 && (
        <Rail title="More like this">
          {related.map((other) => (
            <TitleCard key={contentId(other)} item={other} />
          ))}
        </Rail>
      )}
    </>
  );
}
