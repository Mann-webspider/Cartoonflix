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
| `--ink` | `11 10 15` | Page ground. Near-black with a violet cast, so the brand fields read as part of the same surface rather than pasted on. |
| `--surface` | `20 18 25` | Cards, inputs, skeletons. |
| `--surface-2` | `29 26 36` | Raised surfaces, empty artwork wells, scrollbar thumb. |
| `--text` | `246 244 250` | Primary text. |
| `--text-dim` | `162 155 180` | Secondary text **on dark grounds only**. Tinted from the ground's hue — grey secondary text on a violet ground reads as dirt. |
| `--brand` | `108 77 255` | Periwinkle. Short, large text only: primary buttons, active season pill, avatar. |
| `--brand-deep` | `61 33 184` | Any brand field carrying a paragraph. |
| `--brand-bright` | `138 114 255` | Focus rings, caret, hover on brand, the wordmark's second half. |
| `--brand-ink` | `255 255 255` | Text on a brand field. |
| `--ember` | `255 176 32` | Playback progress. Nothing else, ever. |
| `--line` / `--line-strong` | `rgb(246 244 250 / .1)` / `/ .22` | Hairlines and outlined-button borders. |

### Rules that are not negotiable

**1. Colour tokens are RGB channel triplets, never hex.**
`--ink: 11 10 15`, mapped through `rgb(var(--ink) / <alpha-value>)`. Tailwind
can only composite an alpha modifier onto a token it can decompose. Map a token
to a bare `var(--x)` and *every* `bg-ink/85`-style utility resolves to nothing
and vanishes from the built stylesheet with no error. That failure shipped once:
the header scrim, card hover scrims, progress track, button fills and the player
error plate all rendered with no background at all.

`--line` and `--line-strong` are the deliberate exception — they carry their own
alpha and are never used with a modifier.

**2. `--brand` carries short, large text; `--brand-deep` carries paragraphs.**
White on `--brand` is 5.06:1 — fine for a button label, and that is all it is
used for. Tinted white on `--brand` is 3.76:1 and fails. On `--brand-deep`, the
same tint is 7.4:1.

**3. On a brand field, secondary text tints from `--brand-ink/80`, never
`--text-dim`.** `--text-dim` is tuned for the near-black ground; on
`--brand-deep` it drops to 3.75:1. `TitleCard` takes an `onBrand` prop for
exactly this.

**4. `--ember` answers one question: how far through something are you.** It
appears on the continue-watching progress bar and the player's played track.
The volume slider deliberately does *not* use it — that is why
`.scrubber--volume` overrides the track to `--text`.

**5. Brand must own a region on every state of the home page.** Signed out, that
is the sign-in panel. Signed in, it is the full-bleed `bg-brand-deep` band
around Continue watching. A build where the brand only appears as a 36px avatar
has lost the Max half of the bar.

---

## Type

Helvetica Now, self-hosted as woff2 in `public/fonts/` (converted from the OTFs
already in the repo — 623KB down to 214KB across four faces).

| Family | Weights | Used for |
|---|---|---|
| Helvetica Now **Display** | 700, 900 | `h1`–`h3` and `.font-display`. Tracking `-0.03em`, `text-wrap: balance`. |
| Helvetica Now **Text** | 400, 500 | Body, UI, controls, metadata. |

The two cuts are drawn for different sizes. Display at 14px is the mistake the
family exists to prevent; Text at 80px is the other half of it.

**`font-display: block` on the Display faces, `swap` on Text.** Text has a
credible fallback in the system stack. Display does not — swapping an 80px
heading to the platform sans is precisely the failure the type choice exists to
avoid, and the Display faces are preloaded anyway, so `swap` buys nothing.

Scale in use:

- Billboard `h1` — `clamp(2.5rem, 7vw, 5rem)`, `leading-[0.92]`
- Detail `h1` — `clamp(2.25rem, 6vw, 4.25rem)`, `leading-[0.94]`
- Page `h1` — `clamp(1.75rem, 4vw, 2.75rem)`
- Rail heading — `text-xl` bold
- Card title — `0.95rem` bold; card meta — `0.8rem`
- Body measure caps at `max-w-prose` (68ch)

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
- Player control bar — fades out after 2800ms idle *while playing only*; paused
  means the viewer is deciding something, so the bar stays up.
- Skeletons breathe on a `skeleton` keyframe (opacity 1 → 0.45), not Tailwind's
  stock pulse.
- `prefers-reduced-motion` collapses every animation and transition to 0.01ms.

**Never animate a layout property.** Width, height, padding and margin inside
the header row or the player control bar reflow the whole bar. This is why the
header search field is a fixed width and the volume slider is `hidden sm:block`
rather than expand-on-hover.

---

## Browser surfaces

The parts you did not draw still carry the design, and they are the cheapest
proof a page was built rather than assembled. All themed in `globals.css`:
text selection, caret colour, scrollbar track and thumb (both `scrollbar-color`
and the `::-webkit-` pseudo-elements), the focus ring
(`2px solid --brand-bright`, `3px` offset), and tabular numerals.

---

## Components

Everything in `src/components/`. Nothing here comes from a component library.

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
- **TitleCard** — takes `progress` (draws the ember bar) and `onBrand` (swaps
  the meta colour for a brand field).
- **Player** — see below.
- **Skeleton** — `SkeletonBlock`, `BrowseSkeleton`, `DetailSkeleton`. One
  loading treatment across the whole app; each holds the page's shape so nothing
  jumps when content lands.
- **SessionProvider** — exposes `{ user, ready, signIn, signOut }`. `ready`
  distinguishes "not signed in" from "not known yet", so the header does not
  flash *Sign in* at a signed-in viewer.

### The player

The watch page is the reason the product exists, so it does not ship the
browser's default control bar.

- The scrubber is a real `<input type="range">`, restyled. That buys keyboard
  stepping and screen-reader announcement for free, and both are easy to get
  wrong when rebuilt from divs. `aria-valuetext` reads as a clock
  ("11:19 of 1:19:16"), not a float.
- Track is a gradient: `--ember` played, `--text/0.3` buffered, `--text/0.12`
  remainder. It grows 4px → 6px on hover or focus; the thumb stays hidden until
  the viewer reaches for it.
- Keyboard: space/`k` play-pause, arrows ±10s, `f` fullscreen, `m` mute. Arrows
  are deferred to the scrubber when it holds focus.
- `waiting` starts **false**. `autoPlay` without `muted` is blocked by default
  in Chrome and Safari, so `playing` may never fire; starting true spins a
  loader forever over a paused first frame.
- Fullscreen targets the shell, not the `<video>`, so the authored controls come
  with it.
- Progress writes to `localStorage` every tick and to the API at most every 15
  seconds. `timeupdate` fires about four times a second; a request per tick
  would exhaust the database's free tier in an afternoon.

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
