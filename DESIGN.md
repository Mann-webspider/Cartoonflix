# CartoonFlix — viewer design system

Recorded from the shipped build of `user-frontend/`, not from intentions. Every
value here exists in the code; where a rule looks arbitrary, it is written down
because breaking it caused a real defect once.

Product context lives in [PRODUCT.md](PRODUCT.md). The direction contract is an
HTML comment at the top of `<body>` in `src/app/layout.jsx` — seed key
`0d2ff8ed` — and it survives into the production build on purpose, so the
commitment can be audited from the deployed page.

---

## The commitment

**The category standard, played straight.** Three unusual visual worlds were
put in front of the owner and deliberately declined. Viewers arrive already
knowing how a streaming service works, and that familiarity is an advantage
here, not a failure of nerve. Build accordingly — no irony, no half-step toward
something more unusual.

The craft bar is **Apple TV+ and Max, fused**:

- *Apple TV+* — generous spacing, restrained motion, large editorial artwork,
  light chrome, fewer titles per row. A catalogue of tens of titles cannot hide
  behind density.
- *Max* — bold display typography, high-contrast dark ground, and a saturated
  colour used at page scale rather than sprinkled as an accent.

Dark ground was chosen from the use scene — evening, dim room, sofa or bed —
not from category habit.

---

## Colour

Tokens live in `src/app/globals.css`, mapped in `tailwind.config.mjs`.

| Token | Value | Job |
|---|---|---|
| `--ink` | `10 11 12` | Page ground. Neutral near-black. |
| `--surface` | `22 23 25` | Cards, inputs, skeletons. |
| `--surface-2` | `33 35 38` | Raised surfaces, empty artwork wells, scrollbar thumb. |
| `--text` | `245 243 239` | Bone, not pure white. #FFFFFF on near-black glares at night, and the slight warmth is what separates premium from default. |
| `--dim` | `154 154 158` | Secondary text. |
| `--contrast-ink` | `10 11 12` | Text on an inverted (bone) surface. |
| `--line` / `--line-strong` | `rgb(245 243 239 / .11)` / `/ .24` | Hairlines and outlined-button borders. |

### Rules that are not negotiable

**1. There is no brand accent, and that is the commitment.**
Every poster in this catalogue is loud and saturated. An interface colour would
be a fourth thing competing with the artwork, so the chrome is neutral and the
content is the only colour on the page. This is the discipline Apple TV+ keeps,
and it is the reason the earlier violet-and-amber system was replaced.

The primary action is **bone on ink** — inverted, not coloured. That inversion
is the single strongest contrast move a monochrome system has, so it is spent
on the primary action and the one promotional panel, and nowhere else.

**2. Colour tokens are RGB channel triplets, never hex.**
`--ink: 10 11 12`, mapped through `rgb(var(--ink) / <alpha-value>)`. Tailwind
can only composite an alpha modifier onto a token it can decompose. Map a token
to a bare `var(--x)` and *every* `bg-ink/85`-style utility resolves to nothing
and vanishes from the built stylesheet with no error. That failure shipped once:
the header scrim, card hover scrims, progress track and button fills all
rendered with no background at all.

`--line` and `--line-strong` are the deliberate exception — they carry their own
alpha and are never used with a modifier.

**3. shadcn's semantic names are aliased onto these tokens** in
`tailwind.config.mjs` (`background`, `foreground`, `primary`, `muted`, and so
on). A shadcn component dropped into this app therefore inherits the monochrome
system instead of importing a second palette alongside it.

**4. Playback progress is bone, not a colour.** It was amber under the previous
system; in a monochrome page a single warm bar would read as an accident rather
than a signal.

---

## Type

**Archivo Variable**, self-hosted via `@fontsource-variable/archivo` — no
runtime CDN call. One file covers the whole system, because Archivo's variable
cut carries a **width** axis as well as weight: "Archivo Expanded" is this same
font at a higher `wdth`, not a second download.

| Role | Setting |
|---|---|
| Display (`h1`–`h3`, `.font-display`) | `wdth 118`, weight 800, tracking `-0.035em`, `text-wrap: balance` |
| Body and UI | `wdth 100`, weight 400–500 |
| `.font-display-tight` | `wdth 100` for headings inside narrow containers, like card titles |

The width axis is what makes the display voice cinematic rather than merely
bold: a title set wide reads as a billboard, which is the same trick a film
logotype uses. Helvetica Now was the previous choice and read as neutral
corporate rather than premium.

`.tabular` (`font-variant-numeric: tabular-nums`) on every duration, episode
count and clock, so digits do not jitter as they change.

---

## Layout

Page gutters step `px-5 → sm:px-8 → lg:px-14`, and every full-width section uses
them. Rails set `scroll-pl-*` to the *same* values, so a snapped card lands
inside the margin instead of flush against the viewport edge.

- Cards are **16:9**, `w-[16.5rem] sm:w-[19rem]`, with the title and metadata
  set *below* the frame. The pipeline extracts widescreen stills; a 2:3 poster
  crop would cut them apart. Metadata below also means the row does not reflow
  when a card takes focus.
- Rails use `snap-proximity`, not `snap-mandatory` — mandatory snapping fights
  a trackpad, which is the opposite of the Apple TV+ half of the bar.
- The billboard scrim is **two** gradients (`.billboard-scrim`): vertical to
  seat the artwork on the page, horizontal to hold contrast under the copy. A
  single overlay dark enough for the text kills the image everywhere else.
- Billboard copy sits in `max-w-2xl` — the left half at desktop widths.

---

## Motion

One timing function: `--ease: cubic-bezier(0.16, 1, 0.3, 1)`. Exponential
ease-out, decelerating from an already-visible default. Nothing fades in from
nothing.

- Card hover — artwork `scale-[1.04]` over 500ms, ring lightens, play affordance
  fades in.
- Player control bar — auto-hide is Media Chrome's own, left at its default.
- Skeletons breathe on a `skeleton` keyframe (opacity 1 → 0.45), not Tailwind's
  stock pulse.
- `prefers-reduced-motion` collapses every animation and transition to 0.01ms.

**Never animate a layout property.** Width, height, padding and margin inside a
flex row reflow the whole row. This is why the header search field is a fixed
width rather than expanding on focus.

---

## Browser surfaces

The parts you did not draw still carry the design, and they are the cheapest
proof a page was built rather than assembled. All themed in `globals.css`:
text selection, caret colour, scrollbar track and thumb (both `scrollbar-color`
and the `::-webkit-` pseudo-elements), the focus ring
(`2px solid --text`, `3px` offset), and tabular numerals.

---

## Components

Everything in `src/components/`. shadcn primitives live in `components/ui/`
and are aliased onto the tokens above; the rest is authored here.

- **Icons.jsx** — the whole icon set, drawn by hand. One stroke weight (1.75 at
  24px), round caps and joins; solid marks (play, pause) carry no stroke. No
  emoji, no Unicode glyphs, no icon dependency.
- **Header** — transparent gradient over the billboard, solid with a hairline
  once the page scrolls past 24px. Below `sm` the search field becomes an icon
  link to `/search` and the Home link hides (the wordmark already goes there);
  the row has no width to spare on a 375px viewport.
- **Rail** — native horizontal scroll, with arrows layered on for pointer users.
  The arrows are `aria-hidden` and `tabIndex={-1}` on purpose: the cards are the
  focusable path through a rail, and arrows would double every stop.
- **TitleCard** — takes `progress`, which draws the bone progress bar.
- **Player** — see below.
- **Skeleton** — `SkeletonBlock`, `BrowseSkeleton`, `DetailSkeleton`. One
  loading treatment across the whole app; each holds the page's shape so nothing
  jumps when content lands.
- **SessionProvider** — exposes `{ user, ready, signIn, signOut }`. `ready`
  distinguishes "not signed in" from "not known yet", so the header does not
  flash *Sign in* at a signed-in viewer.

### The player

Built on **Media Chrome** plus **hls-video-element**, not hand-rolled and not
the browser default.

The library supplies the control bar, the captions and quality menus,
picture-in-picture and fullscreen — a large surface that is easy to build badly,
and a half-finished captions menu is worse than none. `hls-video-element` wraps
hls.js and is what exposes the HLS renditions and text tracks to those menus.
Both are plain custom elements, so they take the tokens above directly rather
than arriving with a theme to fight.

Vidstack was tried first and rejected: its `latest` dist-tag still points at
0.6.15 (React 18 only), and the current 1.15.6 line under the `next` tag never
resolves a provider on React 19 — reproduced with its own demo stream and no
custom wiring.

Theming lives on `.cf-player` in `globals.css`:

- `--media-range-bar-color` is `--text`. Played, buffered and remainder are
  three tints of the same bone, so the player stays monochrome with the page.
- The control bar sits on an ink gradient, because it overlays moving artwork.
- Menus use `--surface` with the standard hairline and radius; the chosen
  quality and caption track are shown at full foreground weight so they read as
  chosen rather than decorative.

What the app still owns, because it is specific to this product:

- **Resume.** Position is written to `localStorage` every tick and to the API at
  most every 15 seconds — `timeupdate` fires about four times a second, and a
  request per tick would exhaust the database's free tier in an afternoon.
  localStorage covers a signed-out viewer on one device; the API covers a
  signed-in one anywhere.
- Playback never resumes within 15 seconds of the end; that just replays the
  credits.
- Skip buttons are ±10 seconds.

---

## States

Every fetching surface carries four: loading (skeleton), empty (authored copy
naming what to do next), error (names the problem *and* the recovery, with a
retry control where retrying helps), and content.

**Sample data is never a fallback for a failed request.** `getContents()` falls
back to the bundled catalogue only when `NEXT_PUBLIC_API_URL` is unset. Showing
demonstration titles to someone whose library failed to load presents fiction as
their own content and hides the outage behind a page that looks like it worked.

---

## Accessibility floor

- Skip link to `#main` as the first focusable element — the fixed header is nine
  tab stops deep on every route.
- `aria-current="page"` on the active nav link.
- Client routes set their document title through `useDocumentTitle`; they cannot
  use Next's `metadata` export because the catalogue is fetched with the
  viewer's token.
- No autofocus on load anywhere — it puts a field ahead of the skip link.
- Body text clears 4.5:1 on every ground it is used on. See the colour rules;
  three of the five exist because a combination failed this.

---

## Images

Artwork is a plain `<img>` with `loading="lazy"`, not `next/image`. CloudFront
already serves correctly sized files, and Vercel's optimizer bills per transform
against a free-tier quota. The billboard image carries `fetchPriority="high"`
instead of lazy loading.

---

## Extending this

A new surface inherits this world; it does not get its own. Before adding a
colour, check whether an existing token already answers the question — and if
you are reaching for amber, you almost certainly want something else.
