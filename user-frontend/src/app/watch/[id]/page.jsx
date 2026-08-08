"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Player from "@/components/Player";
import { ChevronLeftIcon } from "@/components/Icons";
import { SkeletonBlock } from "@/components/Skeleton";
import { TitleFacts, TitleCredits, CastRail } from "@/components/TitleMeta";
import MyListButton from "@/components/MyListButton";
import LikeButton from "@/components/LikeButton";
import ShareButton from "@/components/ShareButton";
import Comments from "@/components/Comments";
import EpisodeList from "@/components/EpisodeList";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import { contentId, getContent, getContinueWatching, getSocial } from "@/lib/api";

export default function WatchPage({ params }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink" />}>
      <Watch id={id} />
    </Suspense>
  );
}

/**
 * Resolves what to play before rendering the player.
 *
 * For a series the season and episode arrive as query params; for a movie the
 * title's own video_url is the source. Either way the resume position comes
 * from the server when the viewer is signed in, so playback picks up where it
 * left off on another device.
 */
function Watch({ id }) {
  const search = useSearchParams();
  const season = Number(search.get("s")) || undefined;
  const episode = Number(search.get("e")) || undefined;

  const [item, setItem] = useState(undefined);
  const [startAt, setStartAt] = useState(0);
  const [social, setSocial] = useState(null);

  useEffect(() => {
    getSocial(id).then(setSocial);
  }, [id]);

  useDocumentTitle(
    item && (season && episode ? `${item.title} — S${season} E${episode}` : item.title)
  );

  useEffect(() => {
    getContent(id)
      .then(setItem)
      .catch(() => setItem(null));
  }, [id]);

  useEffect(() => {
    getContinueWatching().then((entries) => {
      const match = entries.find(
        (entry) =>
          contentId(entry.content) === String(id) &&
          (entry.season || undefined) === season &&
          (entry.episode || undefined) === episode
      );
      if (match) setStartAt(match.position_seconds);
    });
  }, [id, season, episode]);

  if (item === undefined) {
    return (
      <div className="min-h-screen bg-black">
        <div className="mx-auto max-w-[1600px] px-4 pt-24 sm:px-8 lg:px-12">
          <SkeletonBlock className="h-4 w-40 rounded" />
          <SkeletonBlock className="mt-5 aspect-video w-full rounded" />
          <SkeletonBlock className="mt-8 h-7 w-72 rounded" />
        </div>
      </div>
    );
  }

  if (item === null) {
    return (
      <div className="flex min-h-screen flex-col justify-center px-5 sm:px-8 lg:px-14">
        <h1 className="font-display text-3xl">We couldn&apos;t find that title</h1>
        <Link href="/" className="mt-6 w-fit rounded bg-text px-6 py-3 font-display text-sm font-bold text-contrast-ink">
          Back to browse
        </Link>
      </div>
    );
  }

  const isSeries = item.type === "series" && Boolean(item.seasons?.length);

  const currentEpisode =
    season && episode
      ? item.seasons
          ?.find((s) => s.season_number === season)
          ?.episodes?.find((e) => e.episode_number === episode)
      : null;

  const src = currentEpisode?.video_url || item.video_url;
  const heading = currentEpisode
    ? currentEpisode.title || `Episode ${episode}`
    : item.title;

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-[1600px] px-4 pt-24 sm:px-8 lg:px-12">
        <Link
          href={`/title/${contentId(item)}`}
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-dim transition-colors duration-200 hover:text-text"
        >
          <ChevronLeftIcon size={16} />
          {item.title}
        </Link>

        <Player
          src={src}
          id={contentId(item)}
          season={season}
          episode={episode}
          startAt={startAt}
          poster={currentEpisode?.thumbnail_url || item.poster_url}
          // An episode carries its own tracks; a film's sit on the title.
          subtitles={currentEpisode?.subtitles ?? item.subtitles ?? []}
        />

        <div className="py-8">
          <h1 className="font-display text-2xl font-bold tracking-[-0.02em]">{heading}</h1>

          {currentEpisode ? (
            <p className="mt-1.5 text-sm text-dim tabular">
              Season {season} · Episode {episode}
              {currentEpisode.air_date ? ` · ${currentEpisode.air_date.slice(0, 4)}` : ""}
            </p>
          ) : (
            <TitleFacts item={item} className="mt-2.5" />
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {/* Keyed on the social payload so the counts land once fetched,
                without the button owning the request. */}
            <LikeButton
              key={`like-${social ? "ready" : "pending"}`}
              id={contentId(item)}
              initialLiked={social?.liked ?? false}
              initialCount={social?.likes ?? 0}
            />
            <MyListButton id={contentId(item)} />
            <ShareButton title={heading} />
          </div>

          {(currentEpisode?.description || item.description) && (
            <p className="mt-6 max-w-prose leading-relaxed text-dim">
              {currentEpisode?.description || item.description}
            </p>
          )}

          {/* An episode page already shows its own facts above, so the series
              credits go here instead of competing with them. */}
          <TitleCredits item={item} className="mt-8 border-t border-line pt-6" />
        </div>

        <CastRail cast={item.cast} className="border-t border-line py-10" />

        <div className="border-t border-line">
          <Comments contentId={contentId(item)} season={season} episode={episode} />
        </div>
      </div>

      {/* Full width, outside the player column: the episode list is navigation,
          and on a series it is the most likely next action. */}
      {isSeries && (
        <div className="border-t border-line bg-ink">
          <EpisodeList contentId={contentId(item)} seasons={item.seasons} />
        </div>
      )}
    </div>
  );
}
