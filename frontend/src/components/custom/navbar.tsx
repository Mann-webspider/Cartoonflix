"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { getUser, logout } from "@/lib/adminApi";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-8">
      <div className="text-xl font-semibold tracking-tight">
        Cartoon<span className="text-primary">Flix</span>
        <span className="ml-2 align-middle text-xs font-normal text-muted-foreground">admin</span>
      </div>
      <div className="flex items-center gap-4">
        {user && <span className="text-sm text-muted-foreground">{user.name}</span>}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-medium">
          {user?.name?.[0]?.toUpperCase() || "A"}
        </div>
        <button
          onClick={() => {
            logout();
            router.push("/auth/login");
          }}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
