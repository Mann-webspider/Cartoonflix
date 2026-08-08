"use client";

import { useCallback, useEffect, useRef } from "react";
import HlsVideo from "hls-video-element/react";
import {
  MediaController,
  MediaControlBar,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaTimeRange,
  MediaTimeDisplay,
  MediaMuteButton,
  MediaVolumeRange,
  MediaPipButton,
  MediaFullscreenButton,
  MediaPosterImage,
  MediaLoadingIndicator,
} from "media-chrome/react";
import {
  MediaCaptionsMenu,
  MediaCaptionsMenuButton,
  MediaRenditionMenu,
  MediaRenditionMenuButton,
} from "media-chrome/react/menu";

import { saveProgress } from "@/lib/api";

/** How often playback position is written back to the API. */
const SYNC_INTERVAL_MS = 15000;
const SEEK_SECONDS = 10;

const localKey = (id, season, episode) =>
  `cf_pos_${id}${season && episode ? `_s${season}e${episode}` : ""}`;

/**
 * Adaptive-bitrate playback.
 *
 * Media Chrome supplies the control bar, the captions and quality menus,
 * picture-in-picture and fullscreen; `hls-video-element` wraps hls.js and is
 * what exposes the HLS renditions and embedded text tracks to those menus.
 * Both are plain custom elements, so the chrome takes this project's design
 * tokens directly instead of arriving with a theme to fight.
 *
 * What stays owned here is the part specific to this product: where playback
 * resumes from, and how often that position is recorded. Position is kept in
 * two places on purpose — localStorage so a signed-out viewer resumes on this
 * device, and the API so a signed-in one resumes anywhere. The API write is
 * throttled because `timeupdate` fires about four times a second and a request
 * per tick would exhaust the database's free tier.
 */
export default function Player({
  src,
  id,
  season,
  episode,
  startAt = 0,
  poster,
  subtitles = [],
}) {
  const videoRef = useRef(null);
  const lastSyncRef = useRef(0);
  const resumedRef = useRef(false);
  const storageKey = localKey(id, season, episode);

  const sync = useCallback(
    (position, duration, force = false) => {
      if (!duration) return;
      const now = Date.now();
      if (!force && now - lastSyncRef.current < SYNC_INTERVAL_MS) return;
      lastSyncRef.current = now;
      saveProgress({ id, season, episode, position, duration });
    },
    [id, season, episode]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    resumedRef.current = false;

    const onLoaded = () => {
      if (resumedRef.current) return;
      resumedRef.current = true;

      const stored = parseFloat(localStorage.getItem(storageKey) || "0");
      const resumeAt = startAt > 0 ? startAt : stored;
      // Never resume into the final moments — that just replays the credits.
      if (resumeAt > 0 && resumeAt < (video.duration || Infinity) - 15) {
        video.currentTime = resumeAt;
      }
    };

    const onTime = () => {
      localStorage.setItem(storageKey, String(video.currentTime));
      sync(video.currentTime, video.duration);
    };
    const flush = () => sync(video.currentTime, video.duration, true);

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("pause", flush);
    window.addEventListener("pagehide", flush);

    return () => {
      flush();
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("pause", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, [src, storageKey, startAt, sync]);

  if (!src) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded bg-surface px-6 text-center text-dim">
        This title hasn&apos;t finished processing yet.
      </div>
    );
  }

  return (
    <MediaController className="cf-player w-full overflow-hidden rounded bg-black">
      <HlsVideo
        ref={videoRef}
        slot="media"
        src={src}
        // Segments and WebVTT tracks come from CloudFront, a different origin;
        // without this the captions menu lists tracks that never load.
        crossOrigin="anonymous"
        playsInline
        autoPlay
      >
        {subtitles.map((track) => (
          <track
            key={track.url}
            kind="subtitles"
            src={track.url}
            label={track.label}
            srcLang={track.language}
            // A "forced" track carries only signs and foreign dialogue, so it
            // is never the one to enable by default.
            default={track.default && !track.forced ? true : undefined}
          />
        ))}
      </HlsVideo>

      {poster && <MediaPosterImage slot="poster" src={poster} />}
      <MediaLoadingIndicator slot="centered-chrome" noautohide />

      {/* Menus are anchored to their buttons and hidden until opened. */}
      <MediaCaptionsMenu hidden anchor="auto" />
      <MediaRenditionMenu hidden anchor="auto" />

      <MediaControlBar>
        <MediaPlayButton />
        <MediaSeekBackwardButton seekoffset={SEEK_SECONDS} />
        <MediaSeekForwardButton seekoffset={SEEK_SECONDS} />
        <MediaTimeRange />
        <MediaTimeDisplay showduration />
        <MediaMuteButton />
        <MediaVolumeRange />
        <MediaCaptionsMenuButton />
        <MediaRenditionMenuButton />
        <MediaPipButton />
        <MediaFullscreenButton />
      </MediaControlBar>
    </MediaController>
  );
}
