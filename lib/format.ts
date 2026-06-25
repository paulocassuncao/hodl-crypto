import type { Currency } from "@/lib/types";

const FIAT = new Set<Currency>(["usd", "eur", "gbp", "jpy"]);
const CRYPTO_SYMBOL: Partial<Record<Currency, string>> = {
  btc: "₿",
  eth: "Ξ",
};

/** Format a price in the active currency (fiat via Intl, crypto with a symbol). */
export const formatCurrency = (
  value: number | null | undefined,
  currency: Currency,
): string => {
  if (value == null || Number.isNaN(value)) return "—";

  if (FIAT.has(currency)) {
    const digits = Math.abs(value) < 1 ? 6 : 2;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: digits,
    }).format(value);
  }

  const symbol = CRYPTO_SYMBOL[currency] ?? "";
  return `${symbol}${value.toLocaleString("en-US", { maximumFractionDigits: 8 })}`;
};

/** Format a large value compactly, e.g. `$1.24T`. */
export const formatCompact = (
  value: number | null | undefined,
  currency: Currency,
): string => {
  if (value == null || Number.isNaN(value)) return "—";

  if (FIAT.has(currency)) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }

  const symbol = CRYPTO_SYMBOL[currency] ?? "";
  return (
    symbol +
    new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value)
  );
};

/** Format a plain count compactly, e.g. `1.2M`. */
export const formatNumber = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
};

/** Format a coin quantity: trims float residue, groups thousands, up to 8 dp. */
export const formatQuantity = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: 8 });
};

/** Format a percentage change with an explicit sign, e.g. `+1.23%`. */
export const formatPercent = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
};

/** Format an epoch-ms timestamp as a terse relative time, e.g. `3h`, `2d`. */
export const formatRelativeTime = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return "";
  const seconds = Math.round((Date.now() - value) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
};

/** Tailwind text color class reflecting a gain/loss/neutral change. */
export const percentColorClass = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return "text-muted-foreground";
  return value >= 0 ? "text-gain" : "text-loss";
};
