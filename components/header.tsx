import Link from "next/link";

import { CurrencySwitcher } from "@/components/currency-switcher";
import { SearchTrigger } from "@/components/search-trigger";
import { ThemeToggle } from "@/components/theme-toggle";

/** Top navigation bar: brand, section links, search, currency, and theme. */
export const Header = (): React.ReactNode => (
  <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-tight">HODL</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link
            href="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Coins
          </Link>
          <Link
            href="/categories"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Categories
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <SearchTrigger />
        <CurrencySwitcher />
        <ThemeToggle />
      </div>
    </div>
  </header>
);
