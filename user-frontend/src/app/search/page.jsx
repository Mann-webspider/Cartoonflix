"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TitleCard from "@/components/TitleCard";
import { SearchIcon } from "@/components/Icons";
import { contentId, searchContents } from "@/lib/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <Search />
    </Suspense>
  );
}

function Search() {
  const router = useRouter();
  const query = useSearchParams().get("q") || "";

  // The field is the page's own control, not a mirror of the header's — on a
  // phone the header has no room for one, and this is where search happens.
  const [draft, setDraft] = useState(query);
  const [results, setResults] = useState(query ? null : []);
  const [failure, setFailure] = useState(null);

  useDocumentTitle(query ? `${query} — search` : "Search");

  useEffect(() => setDraft(query), [query]);

  useEffect(() => {
    if (!query) return setResults([]);
    setResults(null);
    setFailure(null);
    searchContents(query)
      .then(setResults)
      .catch((err) => {
        setFailure(err.message);
        setResults([]);
      });
  }, [query]);

  const submit = (event) => {
    event.preventDefault();
    const next = draft.trim();
    router.replace(next ? `/search?q=${encodeURIComponent(next)}` : "/search");
  };

  return (
    <div className="min-h-screen px-5 pb-20 pt-28 sm:px-8 lg:px-14">
      <h1 className="font-display text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05]">Search</h1>

      <form onSubmit={submit} className="mt-6 max-w-xl">
        <label className="flex items-center gap-3 rounded border border-line bg-surface px-4 py-3 transition-colors duration-200 ease-out focus-within:border-text">
          <SearchIcon size={19} className="shrink-0 text-dim" />
          <input
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Title, genre, or character"
            aria-label="Search titles"
            // Not autofocused: stealing focus on load puts this field ahead of
            // the skip link, so keyboard users lose their way out of the header.
            className="w-full bg-transparent text-base outline-none placeholder:text-dim"
          />
        </label>
      </form>

      {failure ? (
        <p className="mt-8 max-w-prose leading-relaxed text-dim">
          Search is unavailable right now — {failure}
        </p>
      ) : results === null ? (
        <p className="mt-8 text-dim">Searching…</p>
      ) : !query ? (
        <p className="mt-8 max-w-prose leading-relaxed text-dim">
          Start typing to search the library.
        </p>
      ) : results.length === 0 ? (
        <p className="mt-8 max-w-prose leading-relaxed text-dim">
          Nothing matched &ldquo;{query}&rdquo;. Try a shorter word, or a genre
          like Musical.
        </p>
      ) : (
        <>
          <p className="mt-8 text-sm text-dim tabular">
            {results.length} title{results.length === 1 ? "" : "s"}
          </p>
          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-8">
            {results.map((item) => (
              <TitleCard key={contentId(item)} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
