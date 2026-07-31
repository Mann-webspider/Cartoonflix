"use client";

import Link from "next/link";
import { useState } from "react";

export default function ContentCard({ item, landscape = false }) {
  const [broken, setBroken] = useState(false);
  const img = landscape ? item.thumbnail_url : item.poster_url || item.thumbnail_url;
  const href = `/view/${item.video_id ?? item.id ?? item._id}`;

  return (
    <Link
      href={href}
      className={`group relative shrink-0 overflow-hidden rounded-lg border border-border bg-surface transition-transform duration-200 hover:scale-[1.03] hover:border-accent/60 ${
        landscape ? "w-64 aspect-video" : "w-40 aspect-[2/3]"
      }`}
    >
      {img && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt={item.title}
          onError={() => setBroken(true)}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-2 to-surface p-3 text-center">
          <span className="text-sm font-medium text-muted">{item.title}</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
        <p className="line-clamp-2 text-sm font-medium text-white">{item.title}</p>
      </div>
    </Link>
  );
}
