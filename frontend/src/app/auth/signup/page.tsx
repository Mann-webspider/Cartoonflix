"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signup } from "@/lib/adminApi";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signup(name, email, password);
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
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          The first account can be promoted to admin.
        </p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            required placeholder="Name" value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-input bg-background px-4 py-3 focus:border-ring"
          />
          <input
            type="email" required placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-input bg-background px-4 py-3 focus:border-ring"
          />
          <input
            type="password" required minLength={6} placeholder="Password (min 6)" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-input bg-background px-4 py-3 focus:border-ring"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            disabled={busy}
            className="rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Have an account?{" "}
          <Link href="/auth/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
