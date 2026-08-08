"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Search, Archive, RotateCcw, Film, Tv } from "lucide-react";
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
import { PageHeader } from "@/components/shell/AppShell";
import { deleteContent, listContent, updateContent, type Content } from "@/lib/api";

const episodesOf = (content: Content) =>
  (content.seasons ?? []).flatMap((season) => season.episodes);

const mediaLabel = (content: Content) => {
  if (content.type !== "series") {
    return content.status === "ready" ? "Ready" : (content.status ?? "pending");
  }
  const episodes = episodesOf(content);
  if (!episodes.length) return "No episodes";
  return `${episodes.filter((e) => e.status === "ready").length}/${episodes.length} ready`;
};

const mediaTone = (content: Content) => {
  if (content.type === "series") {
    const episodes = episodesOf(content);
    if (!episodes.length) return "outline" as const;
    return episodes.every((e) => e.status === "ready")
      ? ("secondary" as const)
      : ("outline" as const);
  }
  return content.status === "ready" ? ("secondary" as const) : ("outline" as const);
};

/**
 * The library listing.
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

  const act = async (content: Content, action: "archive" | "restore") => {
    setPendingId(content._id);
    try {
      if (action === "archive") {
        await deleteContent(content._id);
        toast({ title: `${content.title} archived`, description: "Hidden from viewers, not deleted." });
      } else {
        await updateContent(content._id, { deleted: false });
        toast({ title: `${content.title} restored` });
      }
      load();
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <>
      <PageHeader
        title={archived ? "Archive" : "Library"}
        description={
          rows
            ? `${rows.length} title${rows.length === 1 ? "" : "s"}`
            : "Loading…"
        }
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
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
      </PageHeader>

      <div className="p-6 lg:p-8">
        {error && (
          <div className="rounded-lg border border-destructive/40 bg-background p-4">
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={load}>
              Try again
            </Button>
          </div>
        )}

        {rows === null && !error && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {rows && filtered.length === 0 && (
          <div className="rounded-lg border border-dashed bg-background p-14 text-center">
            <p className="font-medium">
              {query
                ? "Nothing matched that filter"
                : archived
                  ? "Nothing archived"
                  : "No titles yet"}
            </p>
            {!query && !archived && (
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Create a title, fill it from TMDB, then transcode the video on this
                machine.
              </p>
            )}
          </div>
        )}

        {rows && filtered.length > 0 && (
          <div className="overflow-hidden rounded-lg border bg-background">
            {/* The table needs its own scroll container: without one, a long
                title pushes the whole page sideways instead of the table. */}
            <div className="w-full overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[42%] min-w-[18rem]">Title</TableHead>
                    <TableHead className="w-[10%] min-w-[6rem]">Type</TableHead>
                    <TableHead className="w-[16%] min-w-[8rem]">Media</TableHead>
                    <TableHead className="w-[14%] min-w-[7rem]">Visibility</TableHead>
                    <TableHead className="w-[18%] min-w-[10rem] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((content) => (
                    <TableRow key={content._id}>
                      <TableCell className="min-w-0">
                        <Link
                          href={`/admin/edit/${content._id}`}
                          className="flex items-center gap-3"
                        >
                          <span className="h-11 w-[4.75rem] shrink-0 overflow-hidden rounded bg-muted">
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
                              {content.genres?.slice(0, 3).join(", ") || "No genres"}
                            </span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          {content.type === "series" ? (
                            <Tv className="h-3.5 w-3.5" />
                          ) : (
                            <Film className="h-3.5 w-3.5" />
                          )}
                          {content.type === "series" ? "Series" : "Film"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={mediaTone(content)}>{mediaLabel(content)}</Badge>
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
                            onClick={() => act(content, archived ? "restore" : "archive")}
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
          </div>
        )}
      </div>
    </>
  );
}
