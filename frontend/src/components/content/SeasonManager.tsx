"use client";

import { useState } from "react";
import { Loader2, Plus, Download, Trash2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import MediaIngest, { IngestStatusBadge } from "@/components/content/MediaIngest";
import { deleteSeason, getTmdbSeason, saveSeason, type Content, type Season } from "@/lib/api";

interface Props {
  content: Content;
  onChange: (content: Content) => void;
}

/**
 * Seasons and episodes for a series.
 *
 * The flow is metadata first, media second: pull a season's whole episode list
 * from TMDB (or add episodes by hand), then transcode them one at a time. An
 * episode is a real record from the moment it is listed, which is why the
 * viewer can show "not yet available" instead of the series simply not
 * existing until every episode is done.
 */
export default function SeasonManager({ content, onChange }: Props) {
  const seasons = content.seasons ?? [];
  const [pullingSeason, setPullingSeason] = useState<number | null>(null);
  const [newSeason, setNewSeason] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const fail = (err: unknown, fallback: string) =>
    toast({ title: (err as Error)?.message || fallback, variant: "destructive" });

  const addSeason = async () => {
    const number = Number(newSeason);
    if (!number || number < 0) {
      return toast({ title: "Enter a season number.", variant: "destructive" });
    }
    if (seasons.some((season) => season.season_number === number)) {
      return toast({ title: `Season ${number} already exists.`, variant: "destructive" });
    }

    setBusy(true);
    try {
      const { content: updated } = await saveSeason(content._id, {
        season_number: number,
        episodes: [],
      });
      onChange(updated);
      setNewSeason("");
    } catch (err) {
      fail(err, "Could not add the season");
    } finally {
      setBusy(false);
    }
  };

  /** Seed a season's episode list from TMDB. Merges — published episodes stand. */
  const pullFromTmdb = async (seasonNumber: number) => {
    if (!content.tmdb_id) {
      return toast({
        title: "No TMDB id on this series",
        description: "Fill the series from TMDB on the Details tab first.",
        variant: "destructive",
      });
    }

    setPullingSeason(seasonNumber);
    try {
      const season = await getTmdbSeason(content.tmdb_id, seasonNumber);
      const { content: updated } = await saveSeason(content._id, season);
      onChange(updated);
      toast({
        title: `Season ${seasonNumber} updated`,
        description: `${season.episodes.length} episodes listed. Transcodes already done were kept.`,
      });
    } catch (err) {
      fail(err, "TMDB lookup failed");
    } finally {
      setPullingSeason(null);
    }
  };

  const addEpisode = async (season: Season) => {
    const next = Math.max(0, ...season.episodes.map((e) => e.episode_number)) + 1;
    try {
      const { content: updated } = await saveSeason(content._id, {
        season_number: season.season_number,
        episodes: [{ episode_number: next, title: `Episode ${next}` }],
      });
      onChange(updated);
    } catch (err) {
      fail(err, "Could not add the episode");
    }
  };

  const removeSeason = async (seasonNumber: number) => {
    try {
      const { content: updated } = await deleteSeason(content._id, seasonNumber);
      onChange(updated);
      toast({
        title: `Season ${seasonNumber} removed`,
        description: "Published video files in S3 are untouched.",
      });
    } catch (err) {
      fail(err, "Could not remove the season");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Seasons</h2>
          <p className="text-sm text-muted-foreground">
            List the episodes first, then transcode them one at a time.
          </p>
        </div>

        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-season">Add season</Label>
            <Input
              id="new-season"
              value={newSeason}
              onChange={(event) => setNewSeason(event.target.value)}
              placeholder="1"
              inputMode="numeric"
              className="w-24"
            />
          </div>
          <Button type="button" onClick={addSeason} disabled={busy} variant="secondary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {seasons.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="font-medium">No seasons yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Add season 1 above. If this series has a TMDB id, you can then pull its
            entire episode list in one click instead of typing it out.
          </p>
        </div>
      ) : (
        <Accordion type="multiple" className="rounded-md border px-4">
          {seasons.map((season) => {
            const ready = season.episodes.filter((e) => e.status === "ready").length;
            return (
              <AccordionItem key={season.season_number} value={`s${season.season_number}`}>
                <AccordionTrigger>
                  <span className="flex flex-1 items-center gap-3 pr-3 text-left">
                    <span className="font-medium">
                      {season.season_number === 0
                        ? "Specials"
                        : `Season ${season.season_number}`}
                    </span>
                    <Badge variant="outline">
                      {ready}/{season.episodes.length} ready
                    </Badge>
                  </span>
                </AccordionTrigger>

                <AccordionContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => pullFromTmdb(season.season_number)}
                      disabled={pullingSeason !== null}
                    >
                      {pullingSeason === season.season_number ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-3.5 w-3.5" />
                      )}
                      Pull episodes from TMDB
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addEpisode(season)}
                    >
                      <Plus className="mr-2 h-3.5 w-3.5" />
                      Add one episode
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => removeSeason(season.season_number)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Remove season
                    </Button>
                  </div>

                  {season.episodes.length === 0 ? (
                    <p className="py-4 text-sm text-muted-foreground">
                      No episodes listed yet.
                    </p>
                  ) : (
                    <Accordion type="single" collapsible className="rounded-md border">
                      {season.episodes.map((episode) => (
                        <AccordionItem
                          key={episode.episode_number}
                          value={`e${episode.episode_number}`}
                          className="px-3 last:border-b-0"
                        >
                          <AccordionTrigger>
                            <span className="flex flex-1 items-center gap-3 pr-3 text-left">
                              <span className="w-8 shrink-0 tabular-nums text-muted-foreground">
                                {episode.episode_number}
                              </span>
                              <span className="min-w-0 flex-1 truncate">
                                {episode.title || `Episode ${episode.episode_number}`}
                              </span>
                              <IngestStatusBadge status={episode.status} />
                            </span>
                          </AccordionTrigger>

                          <AccordionContent className="space-y-4 pl-11">
                            {episode.description && (
                              <p className="text-sm text-muted-foreground">
                                {episode.description}
                              </p>
                            )}
                            <Separator />
                            <MediaIngest
                              contentId={content._id}
                              season={season.season_number}
                              episode={episode.episode_number}
                              onPublished={async () => {
                                // Reload so the status badge and the ready count
                                // reflect what just landed.
                                const { content: updated } = await saveSeason(content._id, {
                                  season_number: season.season_number,
                                  episodes: [],
                                });
                                onChange(updated);
                              }}
                            />
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
