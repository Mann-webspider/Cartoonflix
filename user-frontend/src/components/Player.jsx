"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { saveProgress } from "@/lib/api";
import {
  ExitFullscreenIcon,
  FullscreenIcon,
  MuteIcon,
  PauseIcon,
  PlayIcon,
  VolumeIcon,
} from "@/components/Icons";

/** How often playback position is written back to the API. */
const SYNC_INTERVAL_MS = 15000;
/** Idle time before the control bar fades out during playback. */
const IDLE_MS = 2800;
const SKIP_SECONDS = 10;

const localKey = (id, season, episode) =>
  `cf_pos_${id}${season && episode ? `_s${season}e${episode}` : ""}`;

const clockFormat = (seconds) => {
  if (!Number.isFinite(seconds)) return "0:00";
  const whole = Math.floor(seconds);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
};

/**
 * Adaptive-bitrate HLS playback with an authored control bar.
 *
 * The native control bar belongs to no design system, and this is the one
 * screen the whole product exists to show, so the controls are built here. The
 * scrubber is a real `<input type="range">` rather than a styled div: that
 * gives keyboard stepping and screen-reader announcement for free, and both
 * are easy to get wrong by hand.
 *
 * Position is kept in two places on purpose — localStorage so a signed-out
 * viewer resumes on this device, and the API so a signed-in one resumes
 * anywhere. The API write is throttled, because `timeupdate` fires about four
 * times a second and a request per tick would exhaust the free tier.
 */
export default function Player({ src, id, season, episode, startAt = 0, poster }) {
  const videoRef = useRef(null);
  const shellRef = useRef(null);
  const lastSyncRef = useRef(0);
  const idleTimerRef = useRef(null);

  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(false);
  // Starts false: `autoPlay` without `muted` is blocked by default in Chrome
  // and Safari, so `playing` may never fire. Starting true would spin forever
  // over a paused first frame.
  const [waiting, setWaiting] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  // --- source ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src; // Safari plays HLS natively
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) setError("This title could not be loaded. Check your connection and try again.");
      });
    } else {
      setError("This browser cannot play HLS video.");
      return;
    }

    return () => hls?.destroy();
  }, [src]);

  // --- playback state, resume, and progress sync ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const key = localKey(id, season, episode);
    const stored = parseFloat(localStorage.getItem(key) || "0");
    const resumeAt = startAt > 0 ? startAt : stored;

    const sync = (force = false) => {
      if (!video.duration) return;
      const now = Date.now();
      if (!force && now - lastSyncRef.current < SYNC_INTERVAL_MS) return;
      lastSyncRef.current = now;
      saveProgress({ id, season, episode, position: video.currentTime, duration: video.duration });
    };

    const onLoaded = () => {
      setDuration(video.duration || 0);
      // Never resume into the final moments — that just replays the credits.
      if (resumeAt > 0 && resumeAt < (video.duration || Infinity) - 15) {
        video.currentTime = resumeAt;
      }
    };
    const onTime = () => {
      setCurrent(video.currentTime);
      localStorage.setItem(key, String(video.currentTime));
      sync();
    };
    const onProgress = () => {
      const ranges = video.buffered;
      setBuffered(ranges.length ? ranges.end(ranges.length - 1) : 0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      sync(true);
    };
    const onWaiting = () => setWaiting(true);
    const onReady = () => setWaiting(false);
    const onVolume = () => {
      setMuted(video.muted);
      setVolume(video.volume);
    };
    const onUnload = () => sync(true);

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("progress", onProgress);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onReady);
    video.addEventListener("canplay", onReady);
    video.addEventListener("volumechange", onVolume);
    window.addEventListener("pagehide", onUnload);

    return () => {
      onUnload();
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("progress", onProgress);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("volumechange", onVolume);
      window.removeEventListener("pagehide", onUnload);
    };
  }, [src, id, season, episode, startAt]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // --- controls ---
  const revealControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(idleTimerRef.current);
    // Paused means the viewer is deciding something; leave the bar up.
    if (playing) idleTimerRef.current = setTimeout(() => setControlsVisible(false), IDLE_MS);
  }, [playing]);

  useEffect(() => {
    revealControls();
    return () => clearTimeout(idleTimerRef.current);
  }, [revealControls]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const seekBy = (delta) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(0, video.currentTime + delta), video.duration || 0);
    revealControls();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else shellRef.current?.requestFullscreen?.();
  };

  const onKeyDown = (event) => {
    const handlers = {
      " ": togglePlay,
      k: togglePlay,
      ArrowRight: () => seekBy(SKIP_SECONDS),
      ArrowLeft: () => seekBy(-SKIP_SECONDS),
      f: toggleFullscreen,
      m: () => {
        if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
      },
    };
    const handler = handlers[event.key];
    if (!handler) return;
    // The scrubber owns the arrow keys while it has focus.
    if (event.target.tagName === "INPUT" && event.key.startsWith("Arrow")) return;
    event.preventDefault();
    handler();
    revealControls();
  };

  if (!src) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded bg-surface px-6 text-center text-dim">
        This title hasn&apos;t finished processing yet.
      </div>
    );
  }

  const playedPercent = duration ? (current / duration) * 100 : 0;
  const bufferedPercent = duration ? (buffered / duration) * 100 : 0;

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      ref={shellRef}
      aria-label="Video player"
      onKeyDown={onKeyDown}
      onMouseMove={revealControls}
      onTouchStart={revealControls}
      tabIndex={-1}
      className={`group/player relative overflow-hidden rounded bg-black ${
        playing && !controlsVisible ? "cursor-none" : ""
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        poster={poster}
        onClick={togglePlay}
        className="aspect-video w-full"
      />

      {waiting && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="h-11 w-11 animate-spin rounded-full border-2 border-text/25 border-t-text" />
          <span className="sr-only">Loading video</span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/85 px-6">
          <p role="alert" className="max-w-sm text-center leading-relaxed">
            {error}
          </p>
        </div>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent px-4 pb-3 pt-16 transition-opacity duration-300 ease-out sm:px-6 sm:pb-5 ${
          controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          step="any"
          value={current}
          onChange={(event) => {
            const video = videoRef.current;
            if (video) video.currentTime = Number(event.target.value);
          }}
          aria-label="Seek"
          aria-valuetext={`${clockFormat(current)} of ${clockFormat(duration)}`}
          className="scrubber w-full"
          style={{
            "--played": `${playedPercent}%`,
            "--buffered": `${bufferedPercent}%`,
          }}
        />

        <div className="mt-2 flex items-center gap-3 sm:gap-4">
          <ControlButton onClick={togglePlay} label={playing ? "Pause" : "Play"}>
            {playing ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
          </ControlButton>

          {/* Mute and level, grouped. The slider is hidden below `sm` rather
              than animated open: phones have a hardware volume control, and
              animating width inside this flex row reflows the whole bar. */}
          <div className="flex items-center gap-2">
            <ControlButton
              onClick={() => {
                const video = videoRef.current;
                if (video) video.muted = !video.muted;
              }}
              label={muted ? "Unmute" : "Mute"}
            >
              {muted ? <MuteIcon size={20} /> : <VolumeIcon size={20} />}
            </ControlButton>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(event) => {
                const video = videoRef.current;
                if (!video) return;
                video.volume = Number(event.target.value);
                video.muted = Number(event.target.value) === 0;
              }}
              aria-label="Volume"
              aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)} percent`}
              className="scrubber scrubber--volume hidden w-20 sm:block"
              style={{
                "--played": `${(muted ? 0 : volume) * 100}%`,
                "--buffered": "100%",
              }}
            />
          </div>

          <p className="text-sm text-dim tabular">
            {clockFormat(current)} <span className="text-dim/60">/</span> {clockFormat(duration)}
          </p>

          <ControlButton
            onClick={toggleFullscreen}
            label={fullscreen ? "Exit full screen" : "Full screen"}
            className="ml-auto"
          >
            {fullscreen ? <ExitFullscreenIcon size={20} /> : <FullscreenIcon size={20} />}
          </ControlButton>
        </div>
      </div>
    </section>
  );
}

function ControlButton({ onClick, label, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded text-text transition-colors duration-200 ease-out hover:bg-text/15 ${className}`}
    >
      {children}
    </button>
  );
}
