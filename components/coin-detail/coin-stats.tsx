import { formatCompact, formatCurrency, formatNumber } from "@/lib/format";
import type { CoinDetail, Currency } from "@/lib/types";

/** Grid of key market statistics for a coin. */
export const CoinStats = ({
  coin,
  currency,
}: {
  coin: CoinDetail;
  currency: Currency;
}): React.ReactNode => {
  const md = coin.market_data;
  const stats: { label: string; value: string }[] = [
    { label: "Market Cap", value: formatCompact(md.market_cap[currency], currency) },
    { label: "24h Volume", value: formatCompact(md.total_volume[currency], currency) },
    { label: "24h High", value: formatCurrency(md.high_24h[currency], currency) },
    { label: "24h Low", value: formatCurrency(md.low_24h[currency], currency) },
    { label: "All-Time High", value: formatCurrency(md.ath[currency], currency) },
    { label: "All-Time Low", value: formatCurrency(md.atl[currency], currency) },
    { label: "Circulating Supply", value: formatNumber(md.circulating_supply) },
    {
      label: "Max Supply",
      value: md.max_supply ? formatNumber(md.max_supply) : "∞",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="glass-panel rounded-lg p-3">
          <div className="text-xs text-muted-foreground">{s.label}</div>
          <div className="mt-1 text-sm font-semibold tabular-nums">
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
};
