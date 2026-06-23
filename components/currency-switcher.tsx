"use client";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CURRENCIES, useCurrency } from "@/lib/currency";

/** Dropdown to pick the display currency used across the dashboard. */
export const CurrencySwitcher = (): React.ReactNode => {
  const { currency, setCurrency } = useCurrency();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1 font-medium" />
        }
      >
        {currency.toUpperCase()}
        <ChevronDown className="size-4 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-24">
        {CURRENCIES.map(({ value, label }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setCurrency(value)}
            className={value === currency ? "font-semibold" : undefined}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
