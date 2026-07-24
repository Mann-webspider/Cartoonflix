"use client";

import { useEffect, useRef, useState } from "react";
import Video from "next-video";

export default function VideoPlayer({ movie, videoId }) {
  const videoRef = useRef(null);
  const storageKey = `video_${videoId}_time`;

  const [lastPosition, setLastPosition] = useState(0);

  // Load saved playback time
  useEffect(() => {
    const savedTime = localStorage.getItem(storageKey);
    if (savedTime) {
      setLastPosition(parseFloat(savedTime));
    }
  }, [storageKey]);

  // Restore playback position
  const handleLoadedMetadata = () => {
    if (videoRef.current && lastPosition > 0) {
      videoRef.current.currentTime = lastPosition;
    }
  };

  // Save playback position
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      localStorage.setItem(
        storageKey,
        video.currentTime.toString()
      );
    };

    video.addEventListener("timeupdate", updateTime);
    return () => {
      video.removeEventListener("timeupdate", updateTime);
    };
  }, [storageKey]);

  return (
    <div className="xl:w-4/5 md:w-full xl:h-fit">
      <Video
        ref={videoRef}
        src={movie.video_url}
        className="mediaPlayer"
        onLoadedMetadata={handleLoadedMetadata}
      >
        <track
          kind="subtitles"
          srcLang="en"
          label="English"
          src={movie.subtitle_url || "/subtitles_en.vtt"}
          default
        />
      </Video>
    </div>
  );
}
