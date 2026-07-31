"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login } from "@/lib/adminApi";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      router.push("/admin");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Cartoon<span className="text-primary">Flix</span> admin
        </h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">Sign in to the dashboard.</p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            type="email" required placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-input bg-background px-4 py-3 focus:border-ring"
          />
          <input
            type="password" required placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-input bg-background px-4 py-3 focus:border-ring"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            disabled={busy}
            className="rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Need an account?{" "}
          <Link href="/auth/signup" className="text-primary hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
