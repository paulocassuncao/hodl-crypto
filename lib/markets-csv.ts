/**
 * CSV export for the top-100 market table. Emits raw numeric values (no symbols)
 * so the file is spreadsheet-friendly; the active currency is noted in the price/
 * volume/market-cap headers. Pure (no React/I/O) so it can be unit-tested.
 */

import type { Coin, Currency } from "@/lib/types";

/** Quote a field when it contains a comma, quote, or newline. */
const escapeField = (value: string): string =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const num = (value: number | null): string =>
  value === null || Number.isNaN(value) ? "" : String(value);

/** Serialize market rows to a CSV string with a header row. */
export const marketsToCsv = (coins: Coin[], currency: Currency): string => {
  const cur = currency.toUpperCase();
  const headers = [
    "Rank",
    "Name",
    "Symbol",
    `Price (${cur})`,
    "1h %",
    "24h %",
    "7d %",
    `24h Volume (${cur})`,
    `Market Cap (${cur})`,
  ];
  const lines = [headers.join(",")];
  for (const c of coins) {
    lines.push(
      [
        num(c.market_cap_rank),
        c.name,
        c.symbol.toUpperCase(),
        num(c.current_price),
        num(c.price_change_percentage_1h_in_currency),
        num(c.price_change_percentage_24h_in_currency),
        num(c.price_change_percentage_7d_in_currency),
        num(c.total_volume),
        num(c.market_cap),
      ]
        .map((f) => escapeField(String(f)))
        .join(","),
    );
  }
  return lines.join("\n");
};
