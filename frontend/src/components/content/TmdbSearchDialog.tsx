"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  getTmdbDetails,
  searchTmdb,
  type Content,
  type ContentType,
  type TmdbSearchResult,
} from "@/lib/api";

interface Props {
  type: ContentType;
  defaultQuery?: string;
  onPick: (details: Partial<Content>) => void;
}

/**
 * Search TMDB and fill the form from a chosen match.
 *
 * The operator picks the match rather than the first result being assumed
 * correct: animated series in particular have many near-identical entries
 * (dubs, regional cuts, reboots), and silently importing the wrong one is
 * worse than typing the fields by hand.
 */
export default function TmdbSearchDialog({ type, defaultQuery = "", onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(defaultQuery);
  const [year, setYear] = useState("");
  const [results, setResults] = useState<TmdbSearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);

  const runSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setError(null);
    try {
      setResults(await searchTmdb(query.trim(), type, year || undefined));
    } catch (err) {
      setError((err as Error).message);
      setResults(null);
    } finally {
      setSearching(false);
    }
  };

  const choose = async (result: TmdbSearchResult) => {
    setImportingId(result.tmdb_id);
    setError(null);
    try {
      onPick(await getTmdbDetails(type, result.tmdb_id));
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImportingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" className="gap-2">
          <Search className="h-4 w-4" />
          Fill from TMDB
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Find this {type === "series" ? "series" : "film"} on TMDB</DialogTitle>
          <DialogDescription>
            Choosing a match fills the title, synopsis, genres, cast, directors,
            languages, certification and artwork. Anything you have already typed
            is overwritten.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={runSearch} className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="tmdb-query">Title</Label>
            <Input
              id="tmdb-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tom and Jerry"
              autoComplete="off"
            />
          </div>
          <div className="w-24 space-y-1.5">
            <Label htmlFor="tmdb-year">Year</Label>
            <Input
              id="tmdb-year"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              placeholder="1975"
              inputMode="numeric"
            />
          </div>
          <Button type="submit" disabled={searching || !query.trim()}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </form>

        {error && (
          <p role="alert" className="rounded-md border border-destructive/50 px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <div className="max-h-[22rem] space-y-2 overflow-y-auto">
          {results?.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nothing matched. Try the original-language title, or drop the year.
            </p>
          )}

          {results?.map((result) => (
            <button
              key={result.tmdb_id}
              type="button"
              onClick={() => choose(result)}
              disabled={importingId !== null}
              className="flex w-full items-start gap-3 rounded-md border p-2 text-left transition-colors hover:bg-accent disabled:opacity-60"
            >
              <div className="h-24 w-16 shrink-0 overflow-hidden rounded bg-muted">
                {result.poster_url && (
                  // Remote TMDB artwork in an internal tool — next/image would
                  // need a remotePatterns entry and buy nothing here.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.poster_url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  <span className="truncate">{result.title}</span>
                  {result.release_date && (
                    <Badge variant="secondary">{result.release_date.slice(0, 4)}</Badge>
                  )}
                  {importingId === result.tmdb_id && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                </p>
                {result.original_title && result.original_title !== result.title && (
                  <p className="truncate text-xs text-muted-foreground">
                    {result.original_title}
                  </p>
                )}
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {result.description || "No synopsis on TMDB."}
                </p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
