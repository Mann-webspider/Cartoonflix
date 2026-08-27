"use client";

/**
 * Visitor analytics.
 *
 * Events are queued and sent in batches rather than one request per action.
 * Someone browsing a catalogue generates a lot of small events, and a request
 * apiece would put a request on the network every time they moved — competing
 * with the video segments, which are the thing that must not stutter.
 *
 * Sent to this app's own /api/collect rather than straight to the API. That
 * route runs on Vercel, which resolves the visitor's address to a country
 * before any code sees it, so location costs nothing: no geolocation database
 * in the bundle and no third-party lookup on the request path.
 */

import { getToken } from "./api.js";

const FLUSH_AFTER_MS = 10_000;
const FLUSH_AT_EVENTS = 10;
const VISITOR_KEY = "cf_visitor";
const SESSION_KEY = "cf_session";

let queue = [];
let timer = null;

/** Storage throws in a locked-down browser; analytics is never worth a crash. */
const safeStorage = (store, key, make) => {
  try {
    const existing = store.getItem(key);
    if (existing) return existing;
    const created = make();
    store.setItem(key, created);
    return created;
  } catch {
    return "";
  }
};

const randomId = () =>
  globalThis.crypto?.randomUUID?.() ??
  Math.random().toString(36).slice(2) + Date.now().toString(36);

/** Stable across visits: what makes a returning viewer countable as returning. */
const visitorId = () => safeStorage(localStorage, VISITOR_KEY, randomId);

/** One sitting. Cleared when the tab closes, which is what ends a session. */
const sessionId = () => safeStorage(sessionStorage, SESSION_KEY, randomId);

/**
 * Enough of the user agent to answer "phone or desktop, and which browser".
 *
 * Deliberately coarse. A full user-agent string is close to a fingerprint, and
 * the questions worth asking of it — does the player work on phones, is anyone
 * on Safari — need three words, not a hundred characters.
 */
const client = () => {
  const ua = navigator.userAgent;
  const device = /iPad|Tablet/i.test(ua)
    ? "tablet"
    : /Mobi|Android|iPhone/i.test(ua)
      ? "mobile"
      : /TV|SmartTV|BRAVIA|CrKey/i.test(ua)
        ? "tv"
        : "desktop";

  const browser =
    /Edg\//.test(ua) ? "Edge"
    : /OPR\//.test(ua) ? "Opera"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : /Firefox\//.test(ua) ? "Firefox"
    : "Other";

  const os =
    /Windows/.test(ua) ? "Windows"
    : /Android/.test(ua) ? "Android"
    : /iPhone|iPad|iOS/.test(ua) ? "iOS"
    : /Mac OS X/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux"
    : "Other";

  return { device, browser, os };
};

/**
 * Where this visit came from.
 *
 * Only on the first event of a session: the referrer of a later page is this
 * site itself, and recording that would drown the one answer worth having —
 * whether anyone arrives from outside — in self-referral.
 */
const arrival = () => {
  const params = new URLSearchParams(window.location.search);
  const external =
    document.referrer && !document.referrer.startsWith(window.location.origin)
      ? document.referrer
      : "";

  return {
    referrer: external,
    utm_source: params.get("utm_source") ?? "",
    utm_medium: params.get("utm_medium") ?? "",
    utm_campaign: params.get("utm_campaign") ?? "",
  };
};

let arrivalSent = false;

const flush = (useBeacon = false) => {
  if (!queue.length) return;

  // The token travels in the body, not a header, because sendBeacon cannot
  // set headers — and the batch it sends, on a closing page, is the one most
  // worth attributing to whoever was signed in. The collector lifts it back
  // out; it never leaves this origin.
  const body = JSON.stringify({ events: queue, token: getToken() || undefined });
  queue = [];
  clearTimeout(timer);
  timer = null;

  // sendBeacon survives the page being closed, which is exactly when the last
  // and most interesting events are queued. fetch would be cancelled instead.
  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon("/api/collect", new Blob([body], { type: "application/json" }));
    return;
  }

  fetch("/api/collect", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // A dropped batch is a missing row in a chart, nothing more.
  });
};

/**
 * Record one thing the visitor did.
 *
 * @param {string} type   one of the types the collector accepts
 * @param {object} [props]
 */
export const track = (type, props = {}) => {
  if (typeof window === "undefined") return;

  const event = {
    type,
    path: window.location.pathname,
    session_id: sessionId(),
    visitor_id: visitorId(),
    ...client(),
    ...props,
  };

  if (!arrivalSent) {
    Object.assign(event, arrival());
    arrivalSent = true;
  }

  queue.push(event);

  if (queue.length >= FLUSH_AT_EVENTS) flush();
  else if (!timer) timer = setTimeout(flush, FLUSH_AFTER_MS);
};

/** Send whatever is queued before the page goes away. */
export const flushOnExit = () => flush(true);
