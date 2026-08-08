"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { addComment, deleteComment, getComments } from "@/lib/api";
import { useSession } from "@/components/SessionProvider";
import { Button } from "@/components/ui/button";

const MAX_LENGTH = 2000;

/** "3 minutes ago" reads better than a timestamp on a live thread. */
const relativeTime = (iso) => {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;

  const seconds = Math.round((Date.now() - then) / 1000);
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
      return formatter.format(-Math.round(seconds / size), unit);
    }
  }
  return "just now";
};

/**
 * Discussion beneath the player.
 *
 * Deliberately not reviews: no rating, and a viewer may leave as many as they
 * like. Reviews are an evaluation and live on the title page, where someone
 * decides whether to watch; this is conversation while they do.
 */
export default function Comments({ contentId, season, episode }) {
  const { user, ready } = useSession();
  const [items, setItems] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setItems(await getComments(contentId));
    } catch {
      setItems([]);
    }
  }, [contentId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;

    setBusy(true);
    setError(null);
    try {
      const created = await addComment(contentId, { text: body, season, episode });
      setText("");
      // Prepend rather than refetching: the thread is newest-first, so the new
      // comment belongs at the top and a round trip would only confirm that.
      setItems((current) => [created, ...(current ?? [])]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (comment) => {
    const previous = items;
    setItems((current) => current.filter((c) => c.id !== comment.id));
    try {
      await deleteComment(contentId, comment.id);
    } catch (err) {
      setItems(previous);
      setError(err.message);
    }
  };

  return (
    <section className="py-10">
      <h2 className="mb-5 text-xl font-bold">
        Comments
        {items?.length ? <span className="ml-2 text-dim tabular">{items.length}</span> : null}
      </h2>

      {ready && !user && (
        <p className="mb-6 max-w-prose leading-relaxed text-dim">
          <Link
            href="/login"
            className="text-text underline decoration-line-strong underline-offset-4 hover:decoration-text"
          >
            Sign in
          </Link>{" "}
          to join the conversation.
        </p>
      )}

      {user && (
        <form onSubmit={submit} className="mb-8 max-w-prose">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, MAX_LENGTH))}
            rows={3}
            placeholder="Add a comment"
            aria-label="Add a comment"
            className="w-full rounded border border-line bg-surface px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors duration-200 placeholder:text-dim focus:border-text"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" disabled={busy || !text.trim()}>
              {busy ? "Posting…" : "Comment"}
            </Button>
            {text.length > MAX_LENGTH - 200 && (
              <span className="text-xs text-dim tabular">
                {text.length}/{MAX_LENGTH}
              </span>
            )}
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="mb-5 max-w-prose text-sm">
          {error}
        </p>
      )}

      {items === null ? (
        <p className="text-dim">Loading comments…</p>
      ) : items.length === 0 ? (
        <p className="max-w-prose leading-relaxed text-dim">
          No comments yet.{user ? " Start the conversation." : ""}
        </p>
      ) : (
        <ul className="max-w-prose space-y-5">
          {items.map((comment) => (
            <li key={comment.id} className="border-t border-line pt-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-medium">{comment.username}</span>
                <span className="text-xs text-dim">{relativeTime(comment.created_at)}</span>
                {comment.season && comment.episode ? (
                  <span className="text-xs text-dim tabular">
                    S{comment.season} E{comment.episode}
                  </span>
                ) : null}
                {user?.id === comment.user_id && (
                  <button
                    type="button"
                    onClick={() => remove(comment)}
                    className="ml-auto text-xs text-dim transition-colors duration-200 hover:text-text"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-dim">
                {comment.text}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
