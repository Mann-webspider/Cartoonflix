"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyList, saveMyList } from "@/lib/api";
import { useSession } from "@/components/SessionProvider";
import { CheckIcon, PlusIcon } from "@/components/Icons";

/**
 * Add or remove a title from the viewer's saved list.
 *
 * The button updates immediately and reverts if the write fails: the list is a
 * personal bookmark, and waiting on a round trip to acknowledge a tap makes it
 * feel broken on a slow connection.
 */
export default function MyListButton({ id, className = "" }) {
  const { user } = useSession();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [list, setList] = useState(null);

  useEffect(() => {
    if (!user) return setList(null);
    let active = true;
    getMyList().then((items) => {
      if (!active) return;
      setList(items);
      setSaved(items.includes(id));
    });
    return () => {
      active = false;
    };
  }, [user, id]);

  const toggle = async () => {
    if (!user) return router.push("/login");

    const current = list || [];
    const next = saved ? current.filter((item) => item !== id) : [...current, id];

    setSaved(!saved);
    setList(next);
    try {
      await saveMyList(next);
    } catch {
      setSaved(saved);
      setList(current);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      className={`inline-flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded border border-line-strong bg-ink/50 backdrop-blur transition duration-200 ease-out hover:bg-surface-2 ${className}`}
    >
      {saved ? <CheckIcon size={20} /> : <PlusIcon size={20} />}
      <span className="sr-only">{saved ? "Remove from My List" : "Add to My List"}</span>
    </button>
  );
}
