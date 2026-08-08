"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Search, Archive, RotateCcw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { deleteContent, listContent, updateContent, type Content } from "@/lib/api";

const statusVariant = (content: Content) => {
  if (content.status === "ready") return "secondary" as const;
  if (content.status === "processing") return "default" as const;
  return "outline" as const;
};

const mediaSummary = (content: Content) => {
  if (content.type !== "series") return content.status ?? "pending";
  const episodes = (content.seasons ?? []).flatMap((season) => season.episodes);
  if (!episodes.length) return "no episodes";
  const ready = episodes.filter((episode) => episode.status === "ready").length;
  return `${ready}/${episodes.length} episodes`;
};

/**
 * The library listing, and the admin's landing page.
 *
 * Search filters what has already been fetched rather than querying the server:
 * this catalogue is tens of titles, so a round trip per keystroke would be
 * slower than the filter it replaces.
 */
export default function ContentTable({ archived = false }: { archived?: boolean }) {
  const [rows, setRows] = useState<Content[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = () => {
    setRows(null);
    setError(null);
    listContent(archived)
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  };

  useEffect(load, [archived]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle || !rows) return rows ?? [];
    return rows.filter(
      (row) =>
        row.title?.toLowerCase().includes(needle) ||
        row.genres?.some((genre) => genre.toLowerCase().includes(needle)) ||
        row.tags?.some((tag) => tag.toLowerCase().includes(needle))
    );
  }, [rows, query]);

  const archive = async (content: Content) => {
    setPendingId(content._id);
    try {
      await deleteContent(content._id);
      toast({ title: `${content.title} archived`, description: "Hidden from viewers, not deleted." });
      load();
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setPendingId(null);
    }
  };

  const restore = async (content: Content) => {
    setPendingId(content._id);
    try {
      await updateContent(content._id, { deleted: false });
      toast({ title: `${content.title} restored` });
      load();
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-5 p-6 lg:p-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {archived ? "Archive" : "Library"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows ? `${rows.length} title${rows.length === 1 ? "" : "s"}` : "Loading…"}
          </p>
        </div>

        <div className="flex items-end gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by title, genre or tag"
              className="w-64 pl-8"
              aria-label="Filter titles"
            />
          </div>
          {!archived && (
            <Button asChild>
              <Link href="/admin/new">
                <Plus className="mr-2 h-4 w-4" />
                New title
              </Link>
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 p-4">
          <p className="text-sm">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={load}>
            Try again
          </Button>
        </div>
      )}

      {rows === null && !error && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {rows && filtered.length === 0 && (
        <div className="rounded-md border border-dashed p-12 text-center">
          <p className="font-medium">
            {query ? "Nothing matched that filter" : archived ? "Nothing archived" : "No titles yet"}
          </p>
          {!query && !archived && (
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Create a title, fill it from TMDB, then transcode the video on this machine.
            </p>
          )}
        </div>
      )}

      {rows && filtered.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[45%]">Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Media</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((content) => (
                <TableRow key={content._id}>
                  <TableCell>
                    <Link href={`/admin/edit/${content._id}`} className="flex items-center gap-3">
                      <span className="h-10 w-16 shrink-0 overflow-hidden rounded bg-muted">
                        {(content.thumbnail_url || content.poster_url) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={content.thumbnail_url || content.poster_url}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium hover:underline">
                          {content.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {content.genres?.slice(0, 3).join(", ")}
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">
                    {content.type === "series" ? "Series" : "Film"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(content)}>{mediaSummary(content)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={content.isPublish ? "default" : "outline"}>
                      {content.isPublish ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/edit/${content._id}`}>Edit</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pendingId === content._id}
                        onClick={() => (archived ? restore(content) : archive(content))}
                        className={archived ? undefined : "text-destructive"}
                      >
                        {pendingId === content._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : archived ? (
                          <>
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            Restore
                          </>
                        ) : (
                          <>
                            <Archive className="mr-1.5 h-3.5 w-3.5" />
                            Archive
                          </>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
