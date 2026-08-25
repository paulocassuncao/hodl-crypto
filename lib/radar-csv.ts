/**
 * CSV export for the relative-strength screener.
 *
 * Deliberately not `marketsToCsv`: that one emits each coin's absolute change,
 * and this view shows excess return *over Bitcoin*. Exporting absolutes from a
 * relative screen would hand the user a file that disagrees with the table it
 * came from. Columns mirror what the screener renders — rank, coin, price, and
 * one relative column per momentum window. Pure, so it can be unit-tested.
 */

import { METRICS, METRIC_LABEL, metricValue } from "@/lib/radar";
import type { Coin, Currency } from "@/lib/types";

/** Quote a field when it contains a comma, quote, or newline. */
const escapeField = (value: string): string =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const num = (value: number | null): string =>
  value === null || Number.isNaN(value) ? "" : String(value);

/**
 * Serialize screener rows to CSV. `btc` is the baseline every percentage is
 * measured against; without it the relative columns are genuinely unknown and
 * come out empty rather than silently falling back to absolute values.
 */
export const radarToCsv = (
  coins: Coin[],
  btc: Coin | undefined,
  currency: Currency,
): string => {
  const cur = currency.toUpperCase();
  const headers = [
    "Rank",
    "Name",
    "Symbol",
    `Price (${cur})`,
    ...METRICS.map((m) => `${METRIC_LABEL[m]} vs BTC (%)`),
  ];
  const lines = [headers.join(",")];

  for (const coin of coins) {
    const fields = [
      String(coin.market_cap_rank),
      escapeField(coin.name),
      escapeField(coin.symbol.toUpperCase()),
      num(coin.current_price),
      ...METRICS.map((m) => num(metricValue(coin, m, btc))),
    ];
    lines.push(fields.join(","));
  }

  return lines.join("\n");
};
