"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { deleteReview, getReviews, saveReview } from "@/lib/api";
import { useSession } from "@/components/SessionProvider";
import { StarIcon } from "@/components/Icons";

const MAX_LENGTH = 4000;

const formatDate = (iso) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
};

/**
 * A row of stars used both to display a rating and to set one.
 *
 * As an input it is a radio group, not a row of buttons: that is what it
 * actually is, and it gets arrow-key navigation and a single tab stop for free.
 */
function Stars({ value, onChange, size = 18, label }) {
  const readOnly = !onChange;

  if (readOnly) {
    return (
      <span className="inline-flex gap-0.5 text-ember" aria-label={`${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon key={star} size={size} filled={star <= value} aria-hidden="true" />
        ))}
      </span>
    );
  }

  return (
    <div role="radiogroup" aria-label={label} className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <label
          key={star}
          className={`cursor-pointer transition-colors duration-150 ${
            star <= value ? "text-ember" : "text-dim hover:text-text"
          }`}
        >
          <input
            type="radio"
            name="rating"
            value={star}
            checked={value === star}
            onChange={() => onChange(star)}
            className="sr-only"
          />
          <StarIcon size={size + 4} filled={star <= value} />
          <span className="sr-only">{star} star{star === 1 ? "" : "s"}</span>
        </label>
      ))}
    </div>
  );
}

/**
 * Viewer reviews for one title.
 *
 * One review per person, editable in place — the form is pre-filled with the
 * existing one rather than adding a second, which is also what keeps the
 * average honest.
 */
export default function Reviews({ contentId }) {
  const { user, ready } = useSession();
  const [state, setState] = useState({ data: [], average: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const mine = user ? state.data.find((review) => review.user_id === user.id) : null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setState(await getReviews(contentId));
    } catch {
      setState({ data: [], average: 0, count: 0 });
    } finally {
      setLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    load();
  }, [load]);

  // Pre-fill the form from the viewer's existing review once both have loaded.
  useEffect(() => {
    if (!mine) return;
    setRating(mine.rating);
    setBody(mine.body || "");
  }, [mine]);

  const submit = async (event) => {
    event.preventDefault();
    if (!rating) return setError("Pick a rating first.");

    setBusy(true);
    setError(null);
    try {
      await saveReview(contentId, { rating, body });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteReview(contentId);
      setRating(0);
      setBody("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const others = state.data.filter((review) => review.user_id !== user?.id);

  return (
    <section className="px-5 py-12 sm:px-8 lg:px-14">
      <div className="mb-6 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <h2 className="font-display text-2xl font-bold tracking-[-0.02em]">Reviews</h2>
        {state.count > 0 && (
          <p className="flex items-center gap-2 text-sm text-dim">
            <Stars value={Math.round(state.average)} size={15} />
            <span className="tabular">
              {state.average.toFixed(1)} · {state.count} review{state.count === 1 ? "" : "s"}
            </span>
          </p>
        )}
      </div>

      {ready && !user && (
        <p className="mb-8 max-w-prose leading-relaxed text-dim">
          <Link
            href="/login"
            className="text-text underline decoration-line-strong underline-offset-4 hover:decoration-brand-bright"
          >
            Sign in
          </Link>{" "}
          to leave a review.
        </p>
      )}

      {user && (
        <form onSubmit={submit} className="mb-10 max-w-prose rounded border border-line bg-surface p-5">
          <p className="mb-3 font-display text-base font-bold">
            {mine ? "Your review" : "Write a review"}
          </p>

          <Stars value={rating} onChange={setRating} label="Your rating" />

          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value.slice(0, MAX_LENGTH))}
            rows={4}
            placeholder="What did you think? (optional)"
            className="mt-4 w-full rounded border border-line bg-ink px-3 py-2 text-sm leading-relaxed outline-none transition-colors duration-200 placeholder:text-dim focus:border-brand-bright"
          />

          {error && (
            <p role="alert" className="mt-3 text-sm">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-brand px-6 py-2.5 font-display text-sm font-bold text-brand-ink transition-colors duration-200 hover:bg-brand-bright disabled:opacity-60"
            >
              {busy ? "Saving…" : mine ? "Update review" : "Post review"}
            </button>
            {mine && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="text-sm text-dim transition-colors duration-200 hover:text-text"
              >
                Delete
              </button>
            )}
            <span className="ml-auto text-xs text-dim tabular">
              {body.length}/{MAX_LENGTH}
            </span>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-dim">Loading reviews…</p>
      ) : others.length === 0 ? (
        <p className="max-w-prose leading-relaxed text-dim">
          {state.count === 0
            ? "No reviews yet. Be the first."
            : "No other reviews yet."}
        </p>
      ) : (
        <ul className="max-w-prose space-y-6">
          {others.map((review) => (
            <li key={review.id} className="border-t border-line pt-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-display text-base font-bold">{review.username}</span>
                <Stars value={review.rating} size={14} />
                <span className="text-xs text-dim tabular">
                  {formatDate(review.updated_at || review.created_at)}
                </span>
              </div>
              {review.body && (
                <p className="mt-2 leading-relaxed text-dim">{review.body}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
