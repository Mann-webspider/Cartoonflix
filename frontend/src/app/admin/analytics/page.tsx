"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { getAnalytics, type Analytics, type Bucket } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const RANGES = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

const isoDaysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

/** A labelled number, for the row of headline figures. */
function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/**
 * A breakdown as bars rather than numbers alone.
 *
 * Proportion is the thing being read here — whether one country is most of the
 * audience or merely the largest slice of many — and a column of figures makes
 * that arithmetic the reader's job.
 */
function Breakdown({ title, rows, empty }: { title: string; rows: Bucket[]; empty: string }) {
  const largest = Math.max(1, ...rows.map((row) => row.count));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">{empty}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.name} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate" title={row.name}>
                    {row.name}
                  </span>
                  <span className="tabular-nums text-muted-foreground">{row.count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/70"
                    style={{ width: `${(row.count / largest) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Visitor analytics.
 *
 * Everything here is read from this machine's own server. The events are
 * collected by the public API, but reading them back means locations and email
 * addresses, and that is not something to expose over the internet for the sake
 * of a dashboard only one person opens.
 */
export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAnalytics(isoDaysAgo(days)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = data?.totals;
  const played = data?.byType.find((row) => row.name === "play_start")?.count ?? 0;
  const finished = data?.byType.find((row) => row.name === "play_complete")?.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Who visited, what they opened, and how much of it they watched.
          </p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((range) => (
            <Button
              key={range.days}
              type="button"
              size="sm"
              variant={days === range.days ? "default" : "outline"}
              onClick={() => setDays(range.days)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-destructive/50 p-3 text-sm">
          {error}
        </p>
      )}

      {loading && !data ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Reading events…
        </p>
      ) : !data || totals?.events === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No activity recorded in this period. Events arrive once the viewer app is
            deployed with NEXT_PUBLIC_API_URL pointing at the API.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Visitors" value={totals?.visitors ?? 0} hint="distinct devices" />
            <Stat label="Sessions" value={totals?.sessions ?? 0} hint="visits" />
            <Stat
              label="Started watching"
              value={played}
              hint={`${finished} reached the end`}
            />
            <Stat
              label="Signed in"
              value={totals?.signedIn ?? 0}
              hint="accounts seen"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Titles</CardTitle>
              </CardHeader>
              <CardContent>
                {data.titles.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nothing opened yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="pb-2 pr-4 font-medium">Title</th>
                          <th className="pb-2 pr-4 font-medium">Opened</th>
                          <th className="pb-2 pr-4 font-medium">Played</th>
                          <th className="pb-2 pr-4 font-medium">Finished</th>
                          <th className="pb-2 font-medium">Finish rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.titles.map((row) => (
                          <tr key={row.content_id} className="border-t">
                            <td className="py-2 pr-4">{row.title}</td>
                            <td className="py-2 pr-4 tabular-nums">{row.opened}</td>
                            <td className="py-2 pr-4 tabular-nums">{row.played}</td>
                            <td className="py-2 pr-4 tabular-nums">{row.finished}</td>
                            <td className="py-2 tabular-nums text-muted-foreground">
                              {row.played ? `${Math.round((row.finished / row.played) * 100)}%` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Breakdown title="Countries" rows={data.countries} empty="No location recorded. The viewer app supplies this when deployed on Vercel." />
            <Breakdown title="Cities" rows={data.cities} empty="No location recorded." />
            <Breakdown title="Came from" rows={data.referrers} empty="Every visit so far arrived directly." />
            <Breakdown title="Campaigns" rows={data.campaigns} empty="No tagged links used yet." />
            <Breakdown title="Devices" rows={data.devices} empty="—" />
            <Breakdown title="Browsers" rows={data.browsers} empty="—" />
            <Breakdown title="Pages" rows={data.pages} empty="—" />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Searches that found nothing</CardTitle>
              </CardHeader>
              <CardContent>
                {data.emptySearches.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Every search matched something.
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {data.emptySearches.map((row) => (
                      <li key={row.query} className="flex items-baseline justify-between gap-3">
                        <span className="truncate">{row.query}</span>
                        <span className="tabular-nums text-muted-foreground">{row.times}×</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Signed-in viewers</CardTitle>
              </CardHeader>
              <CardContent>
                {data.people.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nobody has browsed while signed in yet — anonymous visits carry no
                    address to record.
                  </p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {data.people.map((person) => (
                      <li
                        key={person.email}
                        className="flex flex-wrap items-baseline justify-between gap-2 border-t pt-2 first:border-t-0 first:pt-0"
                      >
                        <span className="truncate">{person.email}</span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary">{person.titlesWatched} watched</Badge>
                          last seen {new Date(person.lastSeen).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
