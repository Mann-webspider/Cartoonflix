"use client";

import { useEffect, useState } from "react";
import { CheckIcon, ShareIcon } from "@/components/Icons";

/**
 * Share a title.
 *
 * Uses the platform's own share sheet where it exists — on a phone that is the
 * one people actually recognise — and falls back to copying the link. No
 * per-network buttons: they date badly, need third-party script tags, and the
 * share sheet already lists whatever the viewer has installed.
 */
export default function ShareButton({ title, className = "" }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const share = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        // Dismissing the sheet rejects with AbortError; that is not a failure
        // and must not fall through to silently copying instead.
        if (err?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard access can be refused; leave the page alone rather than
      // throwing an error the viewer can do nothing about.
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className={`inline-flex h-[3.25rem] items-center gap-2 rounded border border-line-strong bg-ink/50 px-5 font-display text-[0.95rem] font-bold backdrop-blur transition-colors duration-200 ease-out hover:bg-surface-2 ${className}`}
    >
      {copied ? <CheckIcon size={18} /> : <ShareIcon size={18} />}
      <span>{copied ? "Link copied" : "Share"}</span>
    </button>
  );
}
