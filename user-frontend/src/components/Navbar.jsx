"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, LogOut } from "lucide-react";
import { getUser, logout } from "@/lib/auth";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setUser(getUser());
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors ${
        scrolled ? "bg-bg/90 backdrop-blur border-b border-border" : "bg-gradient-to-b from-black/60 to-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight">
            Cartoon<span className="text-accent">Flix</span>
          </span>
        </Link>

        <div className="flex items-center gap-6 text-sm">
          <Link href="/" className="text-muted hover:text-text transition-colors">
            Home
          </Link>
          <Link href="/search" className="flex items-center gap-1.5 text-muted hover:text-text transition-colors">
            <Search size={16} /> Search
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-text">{user.name}</span>
              <button
                onClick={() => {
                  logout();
                  setUser(null);
                }}
                className="text-muted hover:text-text"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-accent px-3 py-1.5 font-medium text-black hover:bg-accent-hover transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
