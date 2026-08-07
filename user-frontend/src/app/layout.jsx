import "./globals.css";
import Header from "@/components/Header";
import { SessionProvider } from "@/components/SessionProvider";

export const metadata = {
  title: "Cartoonflix",
  description: "A personal streaming library for animated films and series.",
};

/*
  Kept as real markup so it survives the production build and can be grepped
  out of the deployed HTML.
*/
const DIRECTION_CONTRACT = `<!--
THESIS: A personal cartoon library deserves the same craft as a commercial
service. Chosen deliberately over three unusual worlds: viewers already know
how a streaming app works, so the familiar form is the advantage.
OWN-WORLD: Violet-cast near-black ground; Helvetica Now Display Black for
headings, Now Text for everything else; one saturated periwinkle owning whole
regions (primary action, active season, progress) and amber reserved solely for
how far through something you are; 16:9 artwork, light chrome, wide gutters.
STORY: The viewer sees one title at full width, scans rails, resumes what they
started, presses play.
FIRST VIEWPORT: Full-bleed billboard, two-axis scrim, title at clamp(2.5rem,
7vw, 5rem) in the left half above facts, description, Play, More info, My List.
FORM: The category standard played straight, taken as the standing exit against
the dealt roll; craft bar Apple TV+ x Max; seed key 0d2ff8ed.
FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, and DESIGN.md
-->`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* The two faces used above the fold; the rest load on demand. */}
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/HelveticaNowDisplay-Black.woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          type="font/woff2"
          href="/fonts/HelveticaNowText-Regular.woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen bg-ink text-text antialiased">
        <div hidden dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }} />
        <SessionProvider>
          {/* The header is nine tab stops deep and fixed on every route; without
              this, keyboard users cross it again after each navigation. */}
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-5 focus:z-[60] focus:rounded focus:bg-text focus:px-5 focus:py-3 focus:font-display focus:text-sm focus:font-bold focus:text-ink"
          >
            Skip to content
          </a>
          <Header />
          <main id="main">{children}</main>
          <footer className="mt-24 border-t border-line px-5 py-10 text-sm text-dim sm:px-8 lg:px-14">
            <p className="font-display text-base font-bold text-text">Cartoonflix</p>
            <p className="mt-2 max-w-prose leading-relaxed">
              A self-hosted streaming library. Titles are transcoded locally and
              delivered from a personal CDN.
            </p>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
