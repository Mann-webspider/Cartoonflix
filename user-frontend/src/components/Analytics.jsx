"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { track, flushOnExit } from "@/lib/analytics";

/**
 * Records a page view whenever the route changes.
 *
 * A client-side navigation fires no browser page load, so without this the
 * whole site would count as one view — someone browsing thirty titles would be
 * indistinguishable from someone who opened the home page and left.
 */
export default function Analytics() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    track("pageview");
    // search is in the deps because ?s=1&e=2 is a different episode, and a
    // viewer moving through a series would otherwise register as sitting still.
  }, [pathname, search]);

  useEffect(() => {
    // Both, because they fire in different circumstances: pagehide covers a
    // tab closing or navigating away, visibilitychange covers a phone being
    // locked or the app being switched, which on mobile is how most sessions
    // actually end.
    const onHide = () => flushOnExit();
    const onVisibility = () => document.visibilityState === "hidden" && flushOnExit();

    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
