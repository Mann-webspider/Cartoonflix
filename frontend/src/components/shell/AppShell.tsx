"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, LayoutDashboard, Archive, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/library", label: "Library", icon: Film },
  { href: "/admin/archive", label: "Archive", icon: Archive },
];

/**
 * The admin chrome: a fixed rail on the left, content to the right.
 *
 * Flex rather than a 12-column grid. The grid version silently collapsed the
 * content area to one column because `{children}` carried no span, which is
 * how the library table ended up rendering as a sliver.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-svh bg-muted/30">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r bg-background lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-2 border-b px-5">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-foreground text-background">
            <Film className="h-4 w-4" />
          </span>
          <span className="font-semibold tracking-tight">CartoonFlix</span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-3">
          <Button asChild className="w-full">
            <Link href="/admin/new">
              <Plus className="mr-2 h-4 w-4" />
              New title
            </Link>
          </Button>
          <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted-foreground">
            Runs on this machine. Transcodes stay local until you publish.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        {/* The rail is hidden below lg, so small screens get the nav inline. */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b bg-background/95 px-4 backdrop-blur lg:hidden">
          <span className="mr-2 font-semibold tracking-tight">CartoonFlix</span>
          {NAV.map((item) => (
            <Button key={item.href} asChild variant="ghost" size="sm">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

/** Page header used by every admin route, so titles and actions line up. */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b bg-background px-6 py-5 lg:px-8">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
