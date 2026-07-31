"use client";

import { useEffect, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import ContentCard from "@/components/ContentCard";
import { searchContents } from "@/lib/api";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) {
        setResults([]);
        setSearched(false);
        return;
      }
      setResults(await searchContents(q));
      setSearched(true);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="relative mb-8 max-w-xl">
        <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search titles, genres, tags…"
          className="w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-4 text-text placeholder:text-muted focus:border-accent"
        />
      </div>

      {searched && results.length === 0 ? (
        <p className="text-muted">No results for “{q}”.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((item, i) => (
            <ContentCard key={item.id ?? item._id ?? item.video_id ?? i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
