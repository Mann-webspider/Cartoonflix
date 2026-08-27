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
import { TitleFacts, TitleCredits, CastRail } from "@/components/TitleMeta";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { track } from "@/lib/analytics";
import {
  contentId,
  getContent,
  getContents,
  getSocial,
} from "@/lib/api";

export default function TitlePage({ params }) {
  const { id } = use(params);
  const [item, setItem] = useState(undefined);
  const [failure, setFailure] = useState(null);
  const [related, setRelated] = useState([]);
  const [social, setSocial] = useState(null);

  useDocumentTitle(item?.title);

  // What "exploring" looks like in the data: a title opened, whether or not
  // anything was ever played from it.
  useEffect(() => {
    track("title_view", { content_id: String(id) });
  }, [id]);

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
  const isSeries = item.type === "series";

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

            <TitleFacts item={item} className="mt-5" />

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

            <TitleCredits item={item} className="mt-10 border-t border-line pt-6" />
          </div>
        </div>
      </section>

      <CastRail cast={item.cast} className="px-5 py-12 sm:px-8 lg:px-14" />

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
