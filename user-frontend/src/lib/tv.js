/**
 * Television detection.
 *
 * Separated from the navigation itself because two unrelated places need the
 * answer — the key handler and the player — and neither should have to agree
 * with the other by copying a regular expression.
 */

/** Set on <html> so the stylesheet can draw the selection box. */
export const TV_CLASS = "tv";

const OVERRIDE_KEY = "cf_tv_mode";

/**
 * Devices that navigate by D-pad. Fire TV reports AFTB/AFTM/AFTS and friends,
 * Chromecast reports CrKey, and the rest announce themselves plainly enough.
 */
const TV_USER_AGENTS =
  /googletv|android[^;)]*\btv\b|smart-?tv|hbbtv|netcast|nettv|viera|bravia|aquos|web0s|webos|tizen|crkey|aft[a-z]{1,3}\b|philipstv|opera tv/i;

/**
 * Is this a screen being driven by a remote control?
 *
 * The primary signal is not the user agent but `(pointer: none)` — a device
 * with no pointing device at all is the honest statement of the problem, since
 * the whole feature exists because there is nothing to click with. The user
 * agent list is the fallback for televisions that ship a virtual cursor and so
 * still claim to have a pointer.
 *
 * `?tv=1` forces it on and `?tv=0` forces it off, both remembered. Sniffing is
 * guesswork, and a viewer whose television this misreads needs a way to say so
 * — it is also the only way to exercise this on a desktop browser.
 */
export const detectTv = () => {
  if (typeof window === "undefined") return false;

  const override = new URLSearchParams(window.location.search).get("tv");
  if (override === "1" || override === "0") {
    localStorage.setItem(OVERRIDE_KEY, override);
  }

  const stored = localStorage.getItem(OVERRIDE_KEY);
  if (stored === "1") return true;
  if (stored === "0") return false;

  if (window.matchMedia?.("(pointer: none)").matches) return true;

  return TV_USER_AGENTS.test(navigator.userAgent);
};
