"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login, signup } from "@/lib/auth";
import { useSession } from "@/components/SessionProvider";

const FIELD =
  "w-full rounded border border-line bg-surface px-4 py-3 text-[0.95rem] outline-none transition-colors duration-200 placeholder:text-dim focus:border-text";

/**
 * Sign in and sign up share a shape, so they share a component.
 *
 * Accounts here buy exactly one thing — the app remembering you — and the copy
 * says so rather than implying a plan or a payment step that does not exist.
 */
export default function AuthForm({ mode }) {
  const isSignup = mode === "signup";
  const router = useRouter();
  const { signIn } = useSession();

  const [identity, setIdentity] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = isSignup
        ? await signup(username, identity, password)
        : await login(identity, password);
      signIn(user);
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center px-5 py-28 sm:px-8 lg:px-14">
      <div className="w-full max-w-md">
        <h1 className="font-display text-[clamp(2rem,5vw,3rem)] leading-[1.02]">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-4 leading-relaxed text-dim">
          {isSignup
            ? "An account keeps your place across devices and saves titles to your list. No plans, no payment."
            : "Sign in to pick up where you left off."}
        </p>

        <form onSubmit={submit} className="mt-9 space-y-4">
          {isSignup && (
            <div>
              <label htmlFor="username" className="mb-1.5 block text-sm text-dim">
                Username
              </label>
              <input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_]+"
                title="Letters, numbers and underscores only"
                className={FIELD}
              />
            </div>
          )}

          <div>
            <label htmlFor="identity" className="mb-1.5 block text-sm text-dim">
              {isSignup ? "Email" : "Email or username"}
            </label>
            <input
              id="identity"
              type={isSignup ? "email" : "text"}
              value={identity}
              onChange={(event) => setIdentity(event.target.value)}
              autoComplete={isSignup ? "email" : "username"}
              required
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm text-dim">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={isSignup ? 8 : undefined}
              className={FIELD}
            />
            {isSignup && <p className="mt-1.5 text-xs text-dim">At least 8 characters.</p>}
          </div>

          {error && (
            <p role="alert" className="rounded border border-line-strong bg-surface px-4 py-3 text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-text px-6 py-3.5 font-display text-[0.95rem] font-bold text-contrast-ink transition-colors duration-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "One moment…" : isSignup ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="mt-7 text-sm text-dim">
          {isSignup ? "Already have an account? " : "New here? "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="text-text underline decoration-line-strong underline-offset-4 transition-colors duration-200 hover:decoration-text"
          >
            {isSignup ? "Sign in" : "Create one"}
          </Link>
        </p>
      </div>
    </div>
  );
}
