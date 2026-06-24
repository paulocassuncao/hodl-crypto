"use client";

import { useGlobal } from "@/hooks/use-global";
import { useCurrency } from "@/lib/currency";
import {
  formatCompact,
  formatNumber,
  formatPercent,
  percentColorClass,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface Stat {
  label: string;
  value: string;
  changeClass?: string;
}

/** Horizontal strip of global market stats (cap, volume, BTC dominance, coins). */
export const GlobalStatsBar = (): React.ReactNode => {
  const { currency } = useCurrency();
  const { data, isLoading, isError } = useGlobal();

  if (isError) return null;

  const stats: Stat[] = data
    ? [
        {
          label: "Market Cap",
          value: formatCompact(data.total_market_cap[currency], currency),
          changeClass: percentColorClass(
            data.market_cap_change_percentage_24h_usd,
          ),
        },
        {
          label: "24h Volume",
          value: formatCompact(data.total_volume[currency], currency),
        },
        {
          label: "BTC Dominance",
          value: `${(data.market_cap_percentage.btc ?? 0).toFixed(1)}%`,
        },
        {
          label: "ETH Dominance",
          value: `${(data.market_cap_percentage.eth ?? 0).toFixed(1)}%`,
        },
        {
          label: "Active Coins",
          value: formatNumber(data.active_cryptocurrencies),
        },
      ]
    : [];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {isLoading || !data
        ? Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-[68px] animate-pulse rounded-xl bg-card ring-1 ring-foreground/10"
            />
          ))
        : stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-card p-3 ring-1 ring-foreground/10"
            >
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-semibold tabular-nums">
                  {stat.value}
                </span>
                {stat.label === "Market Cap" && data ? (
                  <span
                    className={cn(
                      "text-xs font-medium tabular-nums",
                      stat.changeClass,
                    )}
                  >
                    {formatPercent(data.market_cap_change_percentage_24h_usd)}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
    </div>
  );
};
