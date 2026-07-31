"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sidebarLinks } from "../../lib/sidebarlinks";

export default function Sidebar() {
  const pathName = usePathname();
  return (
    <aside className="col-span-2 h-full border-r border-border bg-card max-lg:col-span-3">
      <nav className="flex flex-col gap-1 p-4">
        {sidebarLinks.map((link) => {
          const isActive =
            (pathName.includes(link.route) && link.route.length > 6) || pathName === link.route;
          return (
            <Link
              key={link.label}
              href={link.route}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {link.icons}
              <span className="max-lg:hidden">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
