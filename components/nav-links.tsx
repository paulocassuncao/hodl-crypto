"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_LINKS } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * Desktop primary nav with active-route highlighting. Client-only for
 * `usePathname`; the atmospheric active state is a glass pill with a luminous
 * underglow so the current section reads at a glance on the dark ground.
 */
export const NavLinks = (): React.ReactNode => {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
      {NAV_LINKS.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-ring rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground",
              active &&
                "bg-glass-high text-foreground shadow-[inset_0_0_0_1px_var(--glass-border)]",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
};
