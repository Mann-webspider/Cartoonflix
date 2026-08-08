"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shell/AppShell";
import { listContent, type Content } from "@/lib/api";

const episodesOf = (rows: Content[]) =>
  rows.flatMap((row) => (row.seasons ?? []).flatMap((season) => season.episodes));

/**
 * What the operator wants to know on landing: how much is in the library, and
 * what is not finished. The numbers are counted client-side from the one list
 * the API already returns — a stats endpoint for tens of rows would be more
 * moving parts than it saves.
 */
export default function Overview() {
  const [rows, setRows] = useState<Content[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listContent()
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return (
      <>
        <PageHeader title="Overview" />
        <div className="p-6 lg:p-8">
          <div className="rounded-lg border border-destructive/40 bg-background p-5">
            <p className="font-medium">The admin API isn&apos;t responding</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Start it with <code className="rounded bg-muted px-1.5 py-0.5">npm run dev</code> in{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">admin-backend</code>.
            </p>
          </div>
        </div>
      </>
    );
  }

  if (!rows) {
    return (
      <>
        <PageHeader title="Overview" />
        <div className="flex justify-center p-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  const episodes = episodesOf(rows);
  const stats = [
    { label: "Titles", value: rows.length },
    { label: "Published", value: rows.filter((r) => r.isPublish).length },
    { label: "Series", value: rows.filter((r) => r.type === "series").length },
    {
      label: "Episodes ready",
      value: episodes.length
        ? `${episodes.filter((e) => e.status === "ready").length}/${episodes.length}`
        : "—",
    },
  ];

  // Anything the operator still has to finish, which is the actual job list.
  const needsWork = rows.filter(
    (row) =>
      !row.isPublish ||
      (row.type === "movie" && row.status !== "ready") ||
      (row.type === "series" &&
        (row.seasons ?? []).flatMap((s) => s.episodes).some((e) => e.status !== "ready"))
  );

  return (
    <>
      <PageHeader title="Overview" description="Your library at a glance">
        <Button asChild>
          <Link href="/admin/new">
            <Plus className="mr-2 h-4 w-4" />
            New title
          </Link>
        </Button>
      </PageHeader>

      <div className="space-y-6 p-6 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg border bg-background p-5">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border bg-background">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-medium">Needs finishing</h2>
              <p className="text-sm text-muted-foreground">
                Unpublished, or with media still to transcode.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/library">
                Full library
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {needsWork.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Everything is transcoded and published.
            </p>
          ) : (
            <ul className="divide-y">
              {needsWork.slice(0, 8).map((content) => (
                <li key={content._id}>
                  <Link
                    href={`/admin/edit/${content._id}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent"
                  >
                    <span className="h-10 w-[4.25rem] shrink-0 overflow-hidden rounded bg-muted">
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
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{content.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {content.type === "series" ? "Series" : "Film"}
                      </span>
                    </span>
                    <Badge variant={content.isPublish ? "secondary" : "outline"}>
                      {content.isPublish ? "Media incomplete" : "Draft"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
