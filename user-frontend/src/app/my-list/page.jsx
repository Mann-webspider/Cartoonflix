"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TitleCard from "@/components/TitleCard";
import { useSession } from "@/components/SessionProvider";
import { contentId, getContents, getMyList } from "@/lib/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export default function MyListPage() {
  const { user, ready } = useSession();
  const [items, setItems] = useState(null);

  useDocumentTitle("My List");

  useEffect(() => {
    if (!ready) return;
    if (!user) return setItems([]);

    Promise.all([getMyList(), getContents()])
      .then(([saved, catalogue]) => {
        const ids = new Set(saved);
        setItems(catalogue.filter((item) => ids.has(contentId(item))));
      })
      .catch(() => setItems([]));
  }, [user, ready]);

  if (!ready) return <div className="min-h-screen" />;

  if (!user) {
    return (
      <Empty
        heading="Your list lives with your account"
        body="Sign in to save titles and pick them up later on any device."
        action={{ href: "/login", label: "Sign in" }}
      />
    );
  }

  if (items === null) return <div className="min-h-screen" />;

  if (items.length === 0) {
    return (
      <Empty
        heading="Nothing saved yet"
        body="Add a title with the + button on any billboard or detail page and it will show up here."
        action={{ href: "/", label: "Browse the library" }}
      />
    );
  }

  return (
    <div className="min-h-screen px-5 pb-20 pt-28 sm:px-8 lg:px-14">
      <h1 className="font-display text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05]">My List</h1>
      <p className="mt-3 text-sm text-dim tabular">
        {items.length} title{items.length === 1 ? "" : "s"}
      </p>
      <div className="mt-8 flex flex-wrap gap-x-4 gap-y-8">
        {items.map((item) => (
          <TitleCard key={contentId(item)} item={item} />
        ))}
      </div>
    </div>
  );
}

function Empty({ heading, body, action }) {
  return (
    <div className="flex min-h-screen flex-col justify-center px-5 sm:px-8 lg:px-14">
      <h1 className="font-display text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05]">{heading}</h1>
      <p className="mt-4 max-w-prose leading-relaxed text-dim">{body}</p>
      <Link
        href={action.href}
        className="mt-8 w-fit rounded bg-text px-7 py-3.5 font-display text-[0.95rem] font-bold text-contrast-ink transition-colors duration-200 hover:bg-white"
      >
        {action.label}
      </Link>
    </div>
  );
}
