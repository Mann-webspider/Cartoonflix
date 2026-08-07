"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/Icons";

/**
 * A horizontally scrolling row of titles.
 *
 * Scrolling is native, so touch, trackpad, and keyboard all work without being
 * reimplemented; the arrows are an affordance layered on top for pointer users
 * and hide themselves when there is nothing further in that direction.
 */
export default function Rail({ title, children }) {
  const trackRef = useRef(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setEdges({ start: track.scrollLeft > 8, end: track.scrollLeft < max - 8 });
  }, []);

  useEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure]);

  // Page by a viewport rather than a fixed pixel count, so the same gesture
  // moves one screenful whatever the breakpoint.
  const page = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className="group/rail relative py-7">
      <h2 className="mb-4 px-5 font-display text-xl font-bold tracking-[-0.02em] sm:px-8 lg:px-14">
        {title}
      </h2>

      <div className="relative">
        <div
          ref={trackRef}
          onScroll={measure}
          // scroll-padding matches the gutter, so a snapped card lands inside
          // the margin instead of flush against the viewport edge. Proximity
          // rather than mandatory: mandatory snapping fights a trackpad.
          className="no-scrollbar flex snap-x snap-proximity gap-4 scroll-pl-5 overflow-x-auto scroll-smooth px-5 pb-2 sm:scroll-pl-8 sm:px-8 lg:scroll-pl-14 lg:px-14"
        >
          {Array.isArray(children)
            ? children.map((child, index) => (
                <div key={index} className="snap-start">
                  {child}
                </div>
              ))
            : children}
        </div>

        <RailArrow side="left" visible={edges.start} onClick={() => page(-1)} />
        <RailArrow side="right" visible={edges.end} onClick={() => page(1)} />
      </div>
    </section>
  );
}

function RailArrow({ side, visible, onClick }) {
  const isLeft = side === "left";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isLeft ? "Scroll left" : "Scroll right"}
      // Hidden from keyboard users on purpose: the cards themselves are the
      // focusable path through the rail, and arrows would double every stop.
      tabIndex={-1}
      aria-hidden="true"
      className={`absolute top-[38%] hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line-strong bg-ink/80 text-text backdrop-blur transition duration-200 ease-out hover:bg-surface-2 lg:flex ${
        isLeft ? "left-3" : "right-3"
      } ${visible ? "opacity-0 group-hover/rail:opacity-100" : "pointer-events-none opacity-0"}`}
    >
      {isLeft ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </button>
  );
}
