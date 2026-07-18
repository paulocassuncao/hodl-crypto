import Link from "next/link";

import { CurrencySwitcher } from "@/components/currency-switcher";
import { MobileNav } from "@/components/mobile-nav";
import { NavLinks } from "@/components/nav-links";
import { SearchTrigger } from "@/components/search-trigger";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

/**
 * Top navigation bar: a frosted-glass panel over the living space. Brand orb +
 * display wordmark, slim section nav, then search, currency, and theme.
 */
export const Header = (): React.ReactNode => (
  <header className="sticky top-0 z-(--z-sticky) border-b border-glass-border bg-background/70 backdrop-blur-xl">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
      <div className="flex items-center gap-2 md:gap-5">
        <MobileNav />
        <Link href="/" className="focus-ring flex items-center gap-2.5 rounded-lg">
          {/* Brand orb — a small luminous body, the app's presence in the space. */}
          <span
            aria-hidden="true"
            className="size-6 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 34% 30%, var(--orb-highlight), var(--primary) 58%, var(--orb-edge))",
              boxShadow:
                "0 0 18px -2px var(--glow-accent), inset 0 0 7px oklch(1 0 0 / 0.35)",
            }}
          />
          <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
            HODL
          </span>
        </Link>
        <NavLinks />
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <SearchTrigger />
        <CurrencySwitcher />
        <ThemeToggle />
        <UserMenu />
      </div>
    </div>
  </header>
);
