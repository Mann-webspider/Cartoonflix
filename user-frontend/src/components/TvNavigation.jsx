"use client";

import { useEffect } from "react";
import { TV_CLASS, detectTv } from "@/lib/tv";
import { bestCandidate } from "@/lib/spatial";
import { SEEK_SECONDS } from "@/lib/playback";

/**
 * Everything a remote can land on. Deliberately the ordinary focusable set:
 * the site is built from real links and buttons, so there is nothing to
 * register and no component has to know this file exists.
 */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const DIRECTIONS = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

/** Off-screen affordances are a tab-order device; a 1px target has no place. */
const MIN_TARGET = 4;

const isReachable = (el) => {
  const rect = el.getBoundingClientRect();
  if (rect.width < MIN_TARGET || rect.height < MIN_TARGET) return false;
  if (el.closest("[hidden]") || el.closest('[aria-hidden="true"]')) return false;
  return true;
};

const inViewport = (el) => {
  const rect = el.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
};

/**
 * Move focus one step. Returns false when there is nothing that way, which
 * leaves the key alone so the page scrolls normally at the end of a list.
 */
const move = (direction) => {
  const candidates = Array.from(document.querySelectorAll(FOCUSABLE)).filter(isReachable);
  if (!candidates.length) return false;

  const active = document.activeElement;
  const current = candidates.includes(active) ? active : null;

  // Nothing focused yet — start at the first thing actually on screen rather
  // than at the top of a document the viewer may have already scrolled past.
  if (!current) {
    (candidates.find(inViewport) || candidates[0]).focus();
    return true;
  }

  const best = bestCandidate(
    current.getBoundingClientRect(),
    candidates
      .filter((candidate) => candidate !== current)
      .map((el) => ({ el, rect: el.getBoundingClientRect() })),
    direction
  );

  if (!best) return false;

  // focus() already scrolls the element into view, in both axes, honouring each
  // container's own scroll-behavior — so a rail glides as it was designed to
  // while the page itself jumps. A hand-rolled scrollIntoView here would only
  // override that choice with a worse one.
  best.el.focus();
  return true;
};

const togglePlay = (controller) => {
  const media = controller.media;
  if (!media) return;
  if (media.paused) media.play().catch(() => {});
  else media.pause();
};

const seekBy = (controller, delta) => {
  const media = controller.media;
  if (!media?.duration) return;
  media.currentTime = Math.min(Math.max(media.currentTime + delta, 0), media.duration);
};

/** Sliders own their own arrows; stepping focus out would strand the scrubber. */
const RANGE_TAGS = new Set(["MEDIA-TIME-RANGE", "MEDIA-VOLUME-RANGE"]);

/**
 * The player's menus while they are open. Media Chrome drives each one's
 * arrows, Enter and Escape itself, and its items live in shadow DOM where the
 * search below cannot see them anyway.
 */
const OPEN_MENU = [
  "media-audio-track-menu",
  "media-captions-menu",
  "media-rendition-menu",
]
  .map((tag) => `${tag}:not([hidden])`)
  .join(",");

/**
 * Directional navigation for televisions.
 *
 * A remote has no cursor: it sends four arrows and an OK, and the viewer needs
 * to see which thing OK will press. So focus moves geometrically — to whatever
 * actually sits left of the current item on screen — rather than along the tab
 * order, which threads through a page in DOM sequence and reads as random when
 * you are steering it with a thumb.
 *
 * Only mounted behaviour is the key handler; the selection box itself is CSS,
 * because focus is already in the right place and drawing it is a styling job.
 *
 * Off by default on anything that looks like it has a mouse. Hijacking the
 * arrow keys on a desktop would break scrolling the page, which is a real
 * regression traded for a feature that machine cannot use.
 */
export default function TvNavigation() {
  useEffect(() => {
    if (!detectTv()) return;

    document.documentElement.classList.add(TV_CLASS);

    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

      const active = document.activeElement;

      // Typing is never navigation: arrows move the caret in a search box.
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable)
      ) {
        return;
      }

      // An open menu owns every key until it closes. Media Chrome drives it,
      // but only once the menu itself holds focus — and opening one from a
      // remote leaves focus on the button that opened it, so without this the
      // next press walks off into the page and strands an open menu on screen
      // with no way to choose anything in it.
      const menu = document.querySelector(OPEN_MENU);
      if (menu) {
        if (active !== menu) {
          menu.focus();
          event.preventDefault();
        }
        return;
      }

      const controller = active?.closest?.("media-controller");

      // The scrubber handles its own left and right, exactly as it does for a
      // keyboard. Moving focus off it instead would leave no way to scrub.
      if (controller && RANGE_TAGS.has(active.tagName)) return;

      if (controller && active === controller) {
        // On the picture itself the arrows scrub, which is what every remote
        // does and what Media Chrome would do if it were still handling them.
        if (event.key === "ArrowLeft") {
          seekBy(controller, -SEEK_SECONDS);
          event.preventDefault();
          return;
        }
        if (event.key === "ArrowRight") {
          seekBy(controller, SEEK_SECONDS);
          event.preventDefault();
          return;
        }
        // OK on a remote sends Enter. Media Chrome maps Space and k but not
        // Enter, so the single most obvious thing a remote does — press OK on
        // the picture to pause it — would otherwise do nothing at all.
        if (event.key === "Enter") {
          togglePlay(controller);
          event.preventDefault();
          return;
        }
      }

      const direction = DIRECTIONS[event.key];
      if (!direction) return;

      // Up from a control returns to the picture rather than leaving the
      // player. Geometry alone sends it to whatever sits above the video —
      // the breadcrumb, usually — which throws the viewer out of the film to
      // dismiss a control bar.
      if (controller && active !== controller && direction === "up") {
        controller.focus();
        event.preventDefault();
        return;
      }

      if (move(direction)) event.preventDefault();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.classList.remove(TV_CLASS);
    };
  }, []);

  return null;
}
