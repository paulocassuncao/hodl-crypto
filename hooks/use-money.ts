"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchFxRates } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import { formatCompact, formatCurrency } from "@/lib/format";
import type { Currency } from "@/lib/types";

/**
 * Display helpers bound to the active currency. Values are stored/fetched in
 * USD across the app; these convert a USD magnitude to the active currency at
 * render time using the FX rates from `/api/fx`. Until the rates load (or for
 * `usd`), conversion is a no-op and formatting falls back to USD so the user
 * never sees a wrong-magnitude figure under the wrong symbol.
 */
export interface Money {
  /** The active display currency. */
  currency: Currency;
  /** USD→currency multiplier (1 when rates are unavailable). */
  rate: number;
  /** True once a real rate is known (or the currency is USD). */
  ready: boolean;
  /** Format a USD value in the active currency, e.g. `formatCurrency`. */
  format: (usd: number | null | undefined) => string;
  /** Compact-format a USD value in the active currency, e.g. `€1.2M`. */
  formatCompact: (usd: number | null | undefined) => string;
  /** Convert an amount entered in the active currency back to USD. */
  toUsd: (amount: number) => number;
}

/** Currency-aware formatting/conversion for USD-denominated figures. */
export const useMoney = (): Money => {
  const { currency } = useCurrency();
  const { data: rates } = useQuery({
    queryKey: ["fx-rates"],
    queryFn: fetchFxRates,
    staleTime: 300_000,
    refetchInterval: 300_000,
  });

  const ready = currency === "usd" || rates?.[currency] != null;
  const rate = ready ? (rates?.[currency] ?? 1) : 1;
  const display: Currency = ready ? currency : "usd";
  const convert = (usd: number | null | undefined): number | null | undefined =>
    usd == null ? usd : usd * rate;

  return {
    currency,
    rate,
    ready,
    format: (usd): string => formatCurrency(convert(usd), display),
    formatCompact: (usd): string => formatCompact(convert(usd), display),
    toUsd: (amount): number => (rate ? amount / rate : amount),
  };
};
