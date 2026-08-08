"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/components/SessionProvider";
import { SearchIcon, UserIcon } from "@/components/Icons";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/my-list", label: "My List" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, signOut } = useSession();
  const [lifted, setLifted] = useState(false);
  const [query, setQuery] = useState("");

  // Transparent over the billboard, solid once the page moves under it.
  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const submitSearch = (event) => {
    event.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ease-out ${
        lifted ? "border-b border-line bg-ink/92 backdrop-blur-md" : "bg-gradient-to-b from-ink/85 to-transparent"
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-3.5 sm:gap-6 sm:px-8 sm:py-4 lg:px-14">
        <Link
          href="/"
          className="shrink-0 font-display text-lg font-black tracking-[-0.045em] sm:text-[1.35rem]"
        >
          Cartoon<span className="text-dim">flix</span>
        </Link>

        <nav className="flex items-center gap-4 sm:gap-5">
          {NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              // Home is hidden on small screens: the wordmark beside it already
              // goes there, and the row has no width to spare.
              className={`whitespace-nowrap text-sm transition-colors duration-200 ease-out hover:text-text ${
                link.href === "/" ? "hidden sm:inline" : ""
              } ${pathname === link.href ? "text-text" : "text-dim"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* A full search field does not fit beside the wordmark and sign-in on
            a phone, so small screens get the icon and the dedicated page. */}
        <Link
          href="/search"
          aria-label="Search titles"
          className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded border border-line bg-surface/70 text-dim transition-colors duration-200 hover:text-text sm:hidden"
        >
          <SearchIcon size={17} />
        </Link>

        <form onSubmit={submitSearch} className="ml-auto hidden items-center sm:flex">
          <label className="flex items-center gap-2 rounded border border-line bg-surface/70 px-3 py-2 transition-colors duration-200 focus-within:border-text">
            <SearchIcon size={17} className="shrink-0 text-dim" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search titles"
              aria-label="Search titles"
              // Fixed width on purpose: expanding it on focus animates a layout
              // property inside a flex row, which reflows the whole header.
              className="w-48 bg-transparent text-sm outline-none placeholder:text-dim"
            />
          </label>
        </form>

        {/* `ready` gates this so a signed-in viewer never sees Sign in flash by. */}
        {ready &&
          (user ? (
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <span className="hidden text-sm text-dim sm:inline">{user.username || user.name}</span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-text text-contrast-ink">
                <UserIcon size={17} />
              </span>
              <button
                type="button"
                onClick={signOut}
                className="whitespace-nowrap text-sm text-dim transition-colors duration-200 hover:text-text"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="shrink-0 whitespace-nowrap rounded bg-text px-3.5 py-2 font-display text-sm font-bold text-contrast-ink transition-colors duration-200 hover:bg-white sm:px-4"
            >
              Sign in
            </Link>
          ))}
      </div>
    </header>
  );
}
