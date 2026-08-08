"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Billboard from "@/components/Billboard";
import Rail from "@/components/Rail";
import TitleCard from "@/components/TitleCard";
import { BrowseSkeleton } from "@/components/Skeleton";
import { useSession } from "@/components/SessionProvider";
import {
  contentId,
  getContents,
  getContinueWatching,
  pickBillboard,
  railsByGenre,
} from "@/lib/api";

export default function HomePage() {
  const { user, ready } = useSession();
  const [catalogue, setCatalogue] = useState(null);
  const [failure, setFailure] = useState(null);
  const [resume, setResume] = useState([]);

  const load = () => {
    setFailure(null);
    setCatalogue(null);
    getContents().then(setCatalogue).catch((err) => setFailure(err.message));
  };

  useEffect(load, []);

  // Re-fetched when the session resolves: the rail is per-viewer, and there is
  // nothing to ask for until we know who is watching.
  useEffect(() => {
    if (!ready) return;
    if (!user) return setResume([]);
    getContinueWatching().then(setResume);
  }, [user, ready]);

  if (failure) {
    return (
      <div className="flex min-h-[70vh] flex-col justify-center px-5 sm:px-8 lg:px-14">
        <h1 className="font-display text-4xl">The library didn&apos;t load</h1>
        <p className="mt-4 max-w-prose leading-relaxed text-dim">{failure}</p>
        <button
          type="button"
          onClick={load}
          className="mt-8 w-fit rounded bg-text px-7 py-3.5 font-display text-[0.95rem] font-bold text-contrast-ink transition-colors duration-200 hover:bg-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!catalogue) return <BrowseSkeleton />;

  if (catalogue.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col justify-center px-5 sm:px-8 lg:px-14">
        <h1 className="font-display text-4xl">Nothing here yet</h1>
        <p className="mt-4 max-w-prose leading-relaxed text-dim">
          The library is empty. Titles appear here once they have been
          transcoded and published from the admin app.
        </p>
      </div>
    );
  }

  const featured = pickBillboard(catalogue);
  const rails = railsByGenre(catalogue);

  return (
    <>
      <Billboard item={featured} />

      {/* Pulled up over the billboard's foot so the first rail peeks above the
          fold — the cue that there is more below. */}
      <div className="relative z-10 -mt-10 pb-10">
        {resume.length > 0 && (
          <Rail title="Continue watching">
            {resume.map((entry) => (
              <TitleCard
                key={`${contentId(entry.content)}-${entry.season}-${entry.episode}`}
                item={entry.content}
                progress={(entry.position_seconds / entry.duration_seconds) * 100}
              />
            ))}
          </Rail>
        )}

        {rails.map((rail) => (
          <Rail key={rail.title} title={rail.title}>
            {rail.items.map((item) => (
              <TitleCard key={contentId(item)} item={item} />
            ))}
          </Rail>
        ))}

        {ready && !user && (
          // Inverted panel: bone on ink is the one high-contrast move a
          // monochrome system has, so it is spent here and nowhere else. The
          // sheen is a single slow specular pass, not a loop of effects.
          <section className="sheen relative mx-5 mt-12 overflow-hidden rounded-lg bg-text px-6 py-12 text-contrast-ink sm:mx-8 sm:px-12 lg:mx-14">
            <h2 className="max-w-2xl text-[clamp(1.85rem,4vw,3rem)] leading-[0.98]">
              Sign in and it remembers where you stopped.
            </h2>
            <p className="mt-4 max-w-prose leading-relaxed text-contrast-ink/70">
              An account keeps your place across devices and saves titles to your
              list. Nothing else — no plans, no payment.
            </p>
            <Button asChild size="lg" variant="subtle" className="mt-8 bg-ink text-text hover:bg-surface-2">
              <Link href="/signup">Create an account</Link>
            </Button>
          </section>
        )}
      </div>
    </>
  );
}
