"use client";

import { formatRuntime, totalEpisodes } from "@/lib/api";

/**
 * The metadata blocks shared by the detail page and the watch page.
 *
 * Extracted rather than duplicated: both surfaces describe the same title, and
 * a copied version is a version that drifts the first time a field is added.
 */

/** Year, certification, runtime and rating as a single separated line. */
export function TitleFacts({ item, className = "" }) {
  const episodes = totalEpisodes(item);
  const isSeries = item.type === "series";
  const year = (item.release_date || item.releaseDate || "").slice(0, 4);

  const facts = [
    isSeries ? "Series" : "Film",
    year,
    item.certification,
    isSeries
      ? episodes && `${episodes} episode${episodes === 1 ? "" : "s"}`
      : formatRuntime(item.duration_seconds) ||
        (item.runtime_minutes && `${item.runtime_minutes}m`),
    item.tmdb_score ? `${item.tmdb_score.toFixed(1)} on TMDB` : null,
  ].filter(Boolean);

  if (!facts.length) return null;

  return (
    <p className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-dim tabular ${className}`}>
      {facts.map((fact, index) => (
        <span key={`${fact}-${index}`} className="flex items-center gap-2.5">
          {index > 0 && (
            <span aria-hidden="true" className="text-dim/60">
              ·
            </span>
          )}
          {fact}
        </span>
      ))}
    </p>
  );
}

/** Genres and credits as a definition list, omitting anything TMDB left empty. */
export function TitleCredits({ item, className = "" }) {
  const rows = [
    { label: "Genres", value: item.genres?.join(", ") },
    {
      label: item.directors?.length === 1 ? "Director" : "Directors",
      value: item.directors?.join(", "),
    },
    {
      label: item.writers?.length === 1 ? "Writer" : "Writers",
      value: item.writers?.slice(0, 4).join(", "),
    },
    { label: "Studio", value: item.studios?.slice(0, 3).join(", ") },
    { label: "Languages", value: item.languages?.map((l) => l.name).join(", ") },
    { label: "Tags", value: item.tags?.slice(0, 6).join(", ") },
  ].filter((row) => row.value);

  if (!rows.length) return null;

  return (
    <dl className={`grid gap-x-10 gap-y-4 text-sm sm:grid-cols-2 ${className}`}>
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-dim">{row.label}</dt>
          <dd className="mt-1">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Cast as a scrolling row of faces.
 *
 * Faces rather than a comma-separated list: recognising a voice actor from a
 * photograph is how people place an animated series, and TMDB supplies them.
 */
export function CastRail({ cast, className = "" }) {
  if (!cast?.length) return null;

  return (
    <section className={className}>
      <h2 className="mb-5 text-xl font-bold">Cast</h2>
      <ul className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
        {cast.slice(0, 16).map((person) => (
          <li key={`${person.name}-${person.character}`} className="w-28 shrink-0">
            <div className="aspect-[2/3] overflow-hidden rounded bg-surface">
              {person.profile_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={person.profile_url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-2 text-center text-xs text-dim">
                  {person.name}
                </div>
              )}
            </div>
            <p className="mt-2 truncate text-sm font-medium">{person.name}</p>
            {person.character && (
              <p className="truncate text-xs text-dim">{person.character}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
