import Link from "next/link";

import { CurrencySwitcher } from "@/components/currency-switcher";
import { MobileNav } from "@/components/mobile-nav";
import { SearchTrigger } from "@/components/search-trigger";
import { ThemeToggle } from "@/components/theme-toggle";
import { NAV_LINKS } from "@/lib/nav";

/** Top navigation bar: brand, section links, search, currency, and theme. */
export const Header = (): React.ReactNode => (
  <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
      <div className="flex items-center gap-2 md:gap-6">
        <MobileNav />
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-tight text-primary">HODL</span>
        </Link>
        <nav className="hidden items-center gap-4 text-sm font-medium md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <SearchTrigger />
        <CurrencySwitcher />
        <ThemeToggle />
      </div>
    </div>
  </header>
);
