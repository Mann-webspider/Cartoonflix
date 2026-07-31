"use client";

import Link from "next/link";
import { useState } from "react";
import { Play, Info } from "lucide-react";

export default function Hero({ item }) {
  const [broken, setBroken] = useState(false);
  if (!item) return null;
  const href = `/view/${item.video_id ?? item.id ?? item._id}`;
  const bg = item.poster_url || item.thumbnail_url;

  return (
    <section className="relative h-[70vh] min-h-[420px] w-full overflow-hidden">
      {bg && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bg}
          alt={item.title}
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-surface-2 to-bg" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-bg/80 to-transparent" />

      <div className="relative z-10 flex h-full max-w-7xl flex-col justify-end gap-4 px-6 pb-16 mx-auto">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-5xl">{item.title}</h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted line-clamp-3 md:text-base">
          {item.description}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <Link
            href={href}
            className="flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 font-medium text-black hover:bg-accent-hover transition-colors"
          >
            <Play size={18} fill="currentColor" /> Play
          </Link>
          <Link
            href={href}
            className="flex items-center gap-2 rounded-md bg-surface/80 px-5 py-2.5 font-medium text-text ring-1 ring-border hover:bg-surface-2 transition-colors"
          >
            <Info size={18} /> Details
          </Link>
        </div>
      </div>
    </section>
  );
}
