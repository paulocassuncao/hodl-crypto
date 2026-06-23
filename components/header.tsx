import Link from "next/link";

import { CurrencySwitcher } from "@/components/currency-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

/** Top navigation bar: brand, currency switcher, and theme toggle. */
export const Header = (): React.ReactNode => (
  <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
      <Link href="/" className="flex items-baseline gap-2">
        <span className="text-xl font-bold tracking-tight">HODL</span>
        <span className="hidden text-sm text-muted-foreground sm:inline">
          Crypto Market Dashboard
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <CurrencySwitcher />
        <ThemeToggle />
      </div>
    </div>
  </header>
);
