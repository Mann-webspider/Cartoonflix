"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/adminApi";

// Client-side guard: redirect to login when no admin token is present.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (getToken()) setOk(true);
    else router.replace("/auth/login");
  }, [router]);

  if (!ok) {
    return <div className="flex h-[60vh] items-center justify-center text-muted-foreground">Checking access…</div>;
  }
  return <>{children}</>;
}
