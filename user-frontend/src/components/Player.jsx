"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  MediaFullscreenButton,
  MediaPosterImage,
  MediaLoadingIndicator,
} from "media-chrome/react";
import {
  MediaAudioTrackMenu,
  MediaCaptionsMenu,
  MediaPlaybackRateMenu,
  MediaRenditionMenu,
  MediaSettingsMenu,
  MediaSettingsMenuButton,
  MediaSettingsMenuItem,
} from "media-chrome/react/menu";

import { saveProgress } from "@/lib/api";
import { detectTv } from "@/lib/tv";
import { SEEK_SECONDS } from "@/lib/playback";
import { track } from "@/lib/analytics";

/** How often playback position is written back to the API. */
const SYNC_INTERVAL_MS = 15000;

const localKey = (id, season, episode) =>
  `cf_pos_${id}${season && episode ? `_s${season}e${episode}` : ""}`;

/**
 * Volume: a vertical slider that rises out of the mute button.
 *
 * Not Media Chrome's own range, which is horizontal and — the part that
 * decides it — works out where a drag landed by comparing `clientX` against the
 * track's horizontal bounds. Rotating that with CSS produces a control that
 * looks vertical and still drags sideways. A native range in vertical writing
 * mode is genuinely vertical, and the browser handles pointer, touch and
 * keyboard without any of it being reimplemented here.
 *
 * It sits absolutely positioned above the button, so it occupies no width in
 * the bar. That is the point: on a phone the row had run past the edge of the
 * screen, taking the skip and fullscreen buttons with it.
 */
function VolumeControl({ videoRef }) {
  const [{ volume, muted }, setLevel] = useState({ volume: 1, muted: false });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Driven by the element, not by local state, so the mute button and the
    // keyboard shortcut move this slider too.
    const sync = () => setLevel({ volume: video.volume, muted: video.muted });
    sync();
    video.addEventListener("volumechange", sync);
    return () => video.removeEventListener("volumechange", sync);
  }, [videoRef]);

  const change = (next) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = next;
    // Dragging to zero means mute; dragging away from it means unmute, or the
    // slider would move while the sound stayed off.
    video.muted = next === 0;
  };

  return (
    <div className="cf-volume">
      <MediaMuteButton />
      <div className="cf-volume-popup">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(event) => change(Number(event.target.value))}
          aria-label="Volume"
          className="cf-volume-range"
        />
      </div>
    </div>
  );
}

/**
 * Adaptive-bitrate playback.
 *
 * Media Chrome supplies the control bar, the captions, audio and quality
 * menus, picture-in-picture and fullscreen; `hls-video-element` wraps hls.js
 * and is what exposes the HLS renditions, the alternate audio languages and
 * the embedded text tracks to those menus.
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
  const controllerRef = useRef(null);
  const lastSyncRef = useRef(0);
  const resumedRef = useRef(false);
  const storageKey = localKey(id, season, episode);

  // Read after mount: on the server there is no document to ask, and a menu row
  // that does nothing on the browsers without it is worse than no row.
  const [pipSupported, setPipSupported] = useState(false);
  useEffect(() => setPipSupported(Boolean(document.pictureInPictureEnabled)), []);

  const togglePip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      // Refused by the browser — a gesture requirement, or another element
      // already holds the window. Nothing here is worth an error over.
    }
  };

  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller || !src || !detectTv()) return;

    // Hand all four arrows to the remote handler. Media Chrome calls
    // preventDefault on them and seeks from anywhere inside the player, which
    // means focus can enter the control bar and then never leave it — the
    // arrows scrub the video instead of stepping between buttons. Seeking and
    // volume are reimplemented there for the one case that wants them, the
    // picture itself; on a television the volume is the television's job.
    controller.setAttribute("hotkeys", "noarrowleft noarrowright noarrowup noarrowdown");

    // Start on the picture, so the first press of left or right scrubs instead
    // of hunting for something to select.
    controller.focus({ preventScroll: true });
  }, [src]);

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

    // Milestones rather than a running count. A quarter of the way through is
    // the number that answers "did anyone actually watch this"; a row every
    // few seconds would answer the same question and cost a thousand times
    // the writes on a free-tier database.
    const milestones = [25, 50, 75, 95];
    const reached = new Set();
    let started = false;

    const onPlaying = () => {
      if (started) return;
      started = true;
      track("play_start", { content_id: id, season, episode });
    };

    const onMilestone = () => {
      if (!video.duration) return;
      const percent = (video.currentTime / video.duration) * 100;
      for (const mark of milestones) {
        if (percent >= mark && !reached.has(mark)) {
          reached.add(mark);
          track(mark === 95 ? "play_complete" : "play_progress", {
            content_id: id,
            season,
            episode,
            percent: mark,
            seconds: Math.floor(video.currentTime),
          });
        }
      }
    };

    const onTime = () => {
      onMilestone();
      localStorage.setItem(storageKey, String(video.currentTime));
      sync(video.currentTime, video.duration);
    };
    const flush = () => sync(video.currentTime, video.duration, true);

    video.addEventListener("playing", onPlaying);
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("pause", flush);
    window.addEventListener("pagehide", flush);

    return () => {
      flush();
      video.removeEventListener("playing", onPlaying);
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
    <MediaController
      ref={controllerRef}
      // Focusable so a remote can land on the picture itself — that is what
      // makes seek-by-arrow and OK-to-pause reachable without a cursor. It also
      // gives Media Chrome's own hotkeys somewhere to fire from on a desktop,
      // where until now they only worked once a control had been clicked.
      tabIndex={0}
      className="cf-player w-full overflow-hidden rounded bg-black"
    >
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

      {/* One menu behind one button, rather than four buttons in the bar. Each
          submenu populates itself — quality from the playlist's variants, audio
          from its EXT-X-MEDIA entries, subtitles from the text tracks — so a
          title with a single dub simply shows nothing under Audio. */}
      <MediaSettingsMenu hidden anchor="auto">
        <MediaSettingsMenuItem>
          Quality
          <MediaRenditionMenu slot="submenu" hidden />
        </MediaSettingsMenuItem>
        <MediaSettingsMenuItem>
          Audio
          <MediaAudioTrackMenu slot="submenu" hidden />
        </MediaSettingsMenuItem>
        <MediaSettingsMenuItem>
          Subtitles
          <MediaCaptionsMenu slot="submenu" hidden />
        </MediaSettingsMenuItem>
        <MediaSettingsMenuItem>
          Speed
          <MediaPlaybackRateMenu slot="submenu" hidden />
        </MediaSettingsMenuItem>
        {/* A plain row rather than Media Chrome's icon-only PiP button, which
            inside a menu would read as an unlabelled glyph among words. */}
        {pipSupported && (
          <MediaSettingsMenuItem onClick={togglePip}>Picture in picture</MediaSettingsMenuItem>
        )}
      </MediaSettingsMenu>

      {/* Play sits in the middle of the picture, where a thumb reaches it
          without crossing the screen. Hidden on a desktop, which expects it at
          the left of the bar instead. */}
      <div slot="centered-chrome" className="cf-center">
        <MediaPlayButton />
      </div>

      {/* Two bars rather than one wrapped bar. A single bar told to wrap grew
          taller than the strip Media Chrome reserves for it, and the second row
          was clipped away — which is how a phone ended up showing a scrubber
          and nothing else. Stacked bars are laid out by Media Chrome itself. */}
      <MediaControlBar className="cf-bar-scrub">
        <MediaTimeRange />
      </MediaControlBar>

      <MediaControlBar className="cf-bar-buttons">
        <MediaPlayButton />
        <MediaSeekBackwardButton seekoffset={SEEK_SECONDS} />
        <MediaSeekForwardButton seekoffset={SEEK_SECONDS} />
        <MediaTimeDisplay showduration />
        <span className="cf-spacer" />
        <VolumeControl videoRef={videoRef} />
        <MediaSettingsMenuButton />
        <MediaFullscreenButton />
      </MediaControlBar>
    </MediaController>
  );
}
