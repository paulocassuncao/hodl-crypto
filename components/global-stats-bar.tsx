"use client";

import { DataFreshness } from "@/components/data-freshness";
import { Button } from "@/components/ui/button";
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
  const { data, isLoading, isError, isFetching, dataUpdatedAt, refetch } =
    useGlobal();

  // A money tool must fail out loud, not vanish: surface the error with a way
  // back instead of unmounting the whole strip (PRODUCT.md principle #4).
  if (isError) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
        <span className="text-sm text-muted-foreground">
          Couldn&apos;t load global market stats.
        </span>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

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
    <div className="space-y-2">
      <div className="flex justify-end">
        <DataFreshness updatedAt={dataUpdatedAt} isFetching={isFetching} />
      </div>
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
    </div>
  );
};
