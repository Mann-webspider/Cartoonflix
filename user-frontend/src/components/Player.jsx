"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

// Adaptive-bitrate HLS player. Uses hls.js where MSE is available and native
// HLS on Safari. Resume position is persisted in localStorage.
export default function Player({ src, videoId }) {
  const videoRef = useRef(null);
  const storageKey = `cf_pos_${videoId}`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src; // Safari
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
    } else {
      video.src = src; // last resort
    }

    const saved = parseFloat(localStorage.getItem(storageKey) || "0");
    const onLoaded = () => {
      if (saved > 0 && saved < (video.duration || Infinity)) video.currentTime = saved;
    };
    const onTime = () => localStorage.setItem(storageKey, String(video.currentTime));

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("timeupdate", onTime);

    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("timeupdate", onTime);
      if (hls) hls.destroy();
    };
  }, [src, storageKey]);

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      className="aspect-video w-full rounded-xl border border-border bg-black"
    />
  );
}
