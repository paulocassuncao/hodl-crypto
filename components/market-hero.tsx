"use client";

import { DataFreshness } from "@/components/data-freshness";
import { FearGreedGauge } from "@/components/fear-greed-gauge.lazy";
import { Sparkline } from "@/components/market-table/sparkline";
import { Button } from "@/components/ui/button";
import { useGlobal } from "@/hooks/use-global";
import { useMarkets } from "@/hooks/use-markets";
import { useCurrency } from "@/lib/currency";
import {
  formatCompact,
  formatNumber,
  formatPercent,
  percentColorClass,
} from "@/lib/format";
import { cn } from "@/lib/utils";

/** A compact glass stat tile for a secondary global metric. */
const StatTile = ({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactNode => (
  <div className="glass-panel rounded-xl px-4 py-3">
    <div className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
      {label}
    </div>
    <div className="mt-1 font-mono text-lg font-semibold tabular-nums">
      {value}
    </div>
  </div>
);

/**
 * The living hero of the Market screen: total market cap as the display-scale
 * star, its 24h move with a pulsing beacon, and the key global readings as glass
 * tiles beside the Fear & Greed gauge. The atmosphere (glow + ambient space)
 * carries the "alive" feel — no fabricated market line; every figure is real.
 */
export const MarketHero = (): React.ReactNode => {
  const { currency } = useCurrency();
  const { data, isLoading, isError, isFetching, dataUpdatedAt, refetch } =
    useGlobal();
  const { data: markets } = useMarkets();
  const btcSpark =
    markets?.find((c) => c.id === "bitcoin")?.sparkline_in_7d?.price ?? [];

  if (isError) {
    return (
      <div className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
        <span className="text-sm text-muted-foreground">
          Couldn&apos;t load the market overview.
        </span>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const change = data?.market_cap_change_percentage_24h_usd ?? 0;
  const up = change >= 0;

  return (
    <section aria-label="Market overview" className="space-y-2">
      <div className="flex justify-end">
        <DataFreshness updatedAt={dataUpdatedAt} isFetching={isFetching} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Hero panel — the market itself */}
        <div className="glass-panel relative overflow-hidden rounded-2xl p-6 sm:p-7">
          {/* Living pulse — Bitcoin's real 7-day line, drawn behind the figure. */}
          {btcSpark.length > 1 ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 z-0 opacity-80 [mask-image:linear-gradient(90deg,transparent,#000_18%)]"
            >
              <Sparkline prices={btcSpark} width={720} height={96} />
              <span className="absolute bottom-2 right-3 font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
                BTC · 7d
              </span>
            </div>
          ) : null}

          <div className="relative z-10">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Total market cap
            </div>
            {isLoading || !data ? (
              <div className="mt-3 h-12 w-64 max-w-full animate-pulse rounded-lg bg-muted" />
            ) : (
              <>
                <div
                  className="mt-2 font-display text-5xl font-extrabold leading-none tracking-tight tabular-nums sm:text-6xl"
                  style={{ textShadow: "0 0 44px var(--glow-accent)" }}
                >
                  {formatCompact(data.total_market_cap[currency], currency)}
                </div>
                <div className="mt-3 flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 rounded-full bg-current",
                      up ? "text-gain" : "text-loss",
                    )}
                    style={{ animation: "beacon 2.6s ease-out infinite" }}
                  />
                  <span
                    className={cn(
                      "font-mono text-base font-semibold tabular-nums",
                      percentColorClass(change),
                    )}
                  >
                    {up ? "▲" : "▼"} {formatPercent(change)}
                  </span>
                  <span className="text-sm text-muted-foreground">past 24h</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Secondary readings */}
        <div className="grid grid-cols-2 gap-4">
          {isLoading || !data ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="glass-panel h-[74px] animate-pulse rounded-xl"
              />
            ))
          ) : (
            <>
              <StatTile
                label="24h Volume"
                value={formatCompact(data.total_volume[currency], currency)}
              />
              <StatTile
                label="BTC Dominance"
                value={`${(data.market_cap_percentage.btc ?? 0).toFixed(1)}%`}
              />
              <StatTile
                label="ETH Dominance"
                value={`${(data.market_cap_percentage.eth ?? 0).toFixed(1)}%`}
              />
              <StatTile
                label="Active Coins"
                value={formatNumber(data.active_cryptocurrencies)}
              />
            </>
          )}
          <div className="col-span-2">
            <FearGreedGauge />
          </div>
        </div>
      </div>
    </section>
  );
};
