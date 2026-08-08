"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleLike } from "@/lib/api";
import { useSession } from "@/components/SessionProvider";
import { HeartIcon } from "@/components/Icons";

/**
 * Like a title.
 *
 * Updates immediately and reverts if the write fails: a like is a small,
 * reversible gesture, and waiting on a round trip to acknowledge a tap makes it
 * feel broken on a slow connection.
 */
export default function LikeButton({ id, initialLiked = false, initialCount = 0 }) {
  const { user } = useSession();
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  const onClick = async () => {
    if (!user) return router.push("/login");

    const previous = { liked, count };
    setLiked(!liked);
    setCount(count + (liked ? -1 : 1));

    try {
      const result = await toggleLike(id);
      // Trust the server's count over the optimistic one — another viewer may
      // have liked it in the meantime.
      setLiked(result.liked);
      setCount(result.likes);
    } catch {
      setLiked(previous.liked);
      setCount(previous.count);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={liked}
      aria-label={liked ? "Remove like" : "Like this title"}
      className={`inline-flex h-[3.25rem] items-center gap-2 rounded border px-5 font-display text-[0.95rem] font-bold backdrop-blur transition-colors duration-200 ease-out ${
        liked
          ? "border-brand bg-brand text-brand-ink hover:bg-brand-bright"
          : "border-line-strong bg-ink/50 hover:bg-surface-2"
      }`}
    >
      <HeartIcon size={18} filled={liked} />
      {count > 0 && <span className="tabular">{count}</span>}
    </button>
  );
}
