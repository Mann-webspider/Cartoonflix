"use client";

import { useEffect, useState } from "react";
import Hero from "@/components/Hero";
import ContentRow from "@/components/ContentRow";
import { getContents, groupByGenre } from "@/lib/api";

export default function Home() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    getContents().then(setItems).catch(() => setItems([]));
  }, []);

  if (items === null) {
    return <div className="flex h-[60vh] items-center justify-center text-muted">Loading…</div>;
  }
  if (!items.length) {
    return <div className="flex h-[60vh] items-center justify-center text-muted">No content yet.</div>;
  }

  const featured = items[0];
  const rows = groupByGenre(items);

  return (
    <div className="pb-10">
      <Hero item={featured} />
      <ContentRow title="Trending" items={items.slice(0, 10)} landscape />
      {rows.map(({ genre, list }) => (
        <ContentRow key={genre} title={genre} items={list} />
      ))}
    </div>
  );
}
