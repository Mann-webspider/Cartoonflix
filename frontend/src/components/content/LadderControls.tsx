"use client";

import { Loader2, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LadderRung, SizeEstimate } from "@/lib/api";

const CRF_MIN = 14;
const CRF_MAX = 32;

export const formatBytes = (bytes: number) =>
  bytes >= 1e9 ? `${(bytes / 1e9).toFixed(2)} GB` : `${Math.round(bytes / 1e6)} MB`;

/**
 * What a CRF value means in words.
 *
 * Operators think in "how good does it look", not in quantiser steps. The
 * boundaries are the conventional x264 reading: below 18 no one can see the
 * difference from the source, and past about 27 flat animation starts to band.
 */
const qualityLabel = (crf: number) =>
  crf <= 18 ? "Visually lossless"
  : crf <= 21 ? "Excellent"
  : crf <= 24 ? "Very good"
  : crf <= 27 ? "Good"
  : "Soft";

interface Props {
  estimate: SizeEstimate | null;
  /** Operator overrides, keyed by rung name. Empty means "pipeline defaults". */
  ladder: Partial<LadderRung>[];
  onLadderChange: (next: Partial<LadderRung>[]) => void;
  onEstimate: () => void;
  busy: boolean;
  disabled: boolean;
}

/**
 * Per-rung quality controls with a measured size prediction.
 *
 * The prediction comes from encoding a few seconds of the real file rather than
 * from arithmetic. The ladder is constant-quality, so its size depends on the
 * footage: multiplying the bitrate cap by the runtime would overstate a cartoon
 * severalfold and argue for cutting quality that was never the problem.
 */
export default function LadderControls({
  estimate,
  ladder,
  onLadderChange,
  onEstimate,
  busy,
  disabled,
}: Props) {
  const setRung = (name: string, patch: Partial<LadderRung>) => {
    const next = ladder.some((rung) => rung.name === name)
      ? ladder.map((rung) => (rung.name === name ? { ...rung, ...patch } : rung))
      : [...ladder, { name, ...patch }];
    onLadderChange(next);
  };

  const valueFor = (rung: LadderRung, key: "crf" | "maxrateK") =>
    (ladder.find((entry) => entry.name === rung.name)?.[key] as number | undefined) ?? rung[key];

  if (!estimate) {
    return (
      <div className="rounded-lg border border-dashed p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Encoding quality</p>
            <p className="text-xs text-muted-foreground">
              Analyse the source to see what each resolution will cost before transcoding it.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={onEstimate} disabled={busy || disabled}>
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Encoding samples…
              </>
            ) : (
              <>
                <Gauge className="mr-2 h-4 w-4" />
                Analyse source
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  const audioBytes = estimate.audio.reduce((sum, track) => sum + track.bytes, 0);
  const versusSource = estimate.totalBytes / estimate.sourceBytes;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Encoding quality</p>
          <p className="text-xs text-muted-foreground">
            Measured from {estimate.sampledSeconds}s sampled across the runtime.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onEstimate} disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Re-measuring…
            </>
          ) : (
            "Re-estimate"
          )}
        </Button>
      </div>

      <div className="space-y-4">
        {estimate.video.map((rung) => {
          const crf = valueFor(rung, "crf");
          const maxrateK = valueFor(rung, "maxrateK");
          // Only the last measurement is real; once a control moves, the figures
          // beside it describe the previous settings until re-measured.
          const stale = crf !== rung.crf || maxrateK !== rung.maxrateK;

          return (
            <div key={rung.name} className="grid gap-3 border-t pt-4 first:border-t-0 first:pt-0 sm:grid-cols-[7rem_1fr_9rem]">
              <div>
                <p className="text-sm font-medium">{rung.name}</p>
                <p className="text-xs text-muted-foreground">{rung.height}p</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs" htmlFor={`crf-${rung.name}`}>
                    Quality — {qualityLabel(crf)}
                  </Label>
                  <span className="text-xs tabular-nums text-muted-foreground">CRF {crf}</span>
                </div>
                {/* Inverted: dragging right must mean better, but a lower CRF is
                    the better picture. */}
                <input
                  id={`crf-${rung.name}`}
                  type="range"
                  min={CRF_MIN}
                  max={CRF_MAX}
                  step={1}
                  value={CRF_MIN + CRF_MAX - crf}
                  onChange={(event) =>
                    setRung(rung.name, { crf: CRF_MIN + CRF_MAX - Number(event.target.value) })
                  }
                  className="w-full accent-foreground"
                />
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground" htmlFor={`cap-${rung.name}`}>
                    Peak cap
                  </Label>
                  <Input
                    id={`cap-${rung.name}`}
                    type="number"
                    min={200}
                    max={20000}
                    step={100}
                    value={maxrateK}
                    onChange={(event) =>
                      setRung(rung.name, { maxrateK: Number(event.target.value) })
                    }
                    className="h-7 w-24 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">kbps</span>
                </div>
              </div>

              <div className={`text-right text-sm ${stale ? "opacity-40" : ""}`}>
                <p className="font-medium tabular-nums">{formatBytes(rung.bytes)}</p>
                <p className="text-xs tabular-nums text-muted-foreground">{rung.kbps} kbps avg</p>
                {stale && <p className="text-xs text-muted-foreground">re-estimate</p>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-1 border-t pt-3 text-sm">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Audio ({estimate.audio.length} track{estimate.audio.length === 1 ? "" : "s"})</span>
          <span className="tabular-nums">{formatBytes(audioBytes)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>Estimated upload</span>
          <span className="tabular-nums">{formatBytes(estimate.totalBytes)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatBytes(estimate.sourceBytes)} source · ladder is{" "}
          {versusSource < 1
            ? `${Math.round((1 - versusSource) * 100)}% smaller than it`
            : `${versusSource.toFixed(2)}× its size`}
        </p>
      </div>
    </div>
  );
}
