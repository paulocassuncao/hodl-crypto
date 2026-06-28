"use client";

import { FearGreedGauge } from "@/components/fear-greed-gauge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCoinChart } from "@/hooks/use-coin-chart";
import { useGlobal } from "@/hooks/use-global";
import { useMoney } from "@/hooks/use-money";
import { usePortfolioPrices } from "@/hooks/use-portfolio-prices";
import { useCurrency } from "@/lib/currency";
import {
  formatCompact,
  formatPercent,
  percentColorClass,
} from "@/lib/format";
import { cn } from "@/lib/utils";

/** PAX Gold tracks spot gold (1 token ≈ 1oz); our free, crypto-native proxy. */
const GOLD_ID = "pax-gold";

/**
 * Radar's market-context HUD: a strip of glanceable cards that restore the
 * dashboard read (mood, BTC dominance, total cap, gold) above the screener
 * table. Reuses existing data hooks; only gold adds a (cheap, cached) fetch.
 */
export const RadarHud = (): React.ReactNode => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <FearGreedGauge />
    <DominanceCard />
    <MarketCapCard />
    <GoldCard />
  </div>
);

/** Shared shell so the stat cards match the Fear & Greed card's height + chrome. */
const StatCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactNode => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-1 flex-col justify-center gap-1">
      {children}
    </CardContent>
  </Card>
);

const DominanceCard = (): React.ReactNode => {
  const { data, isLoading, isError } = useGlobal();
  if (isError) return null;

  return (
    <StatCard title="BTC Dominance">
      {isLoading || !data ? (
        <Skeleton className="h-12 w-full" />
      ) : (
        <>
          <span className="text-3xl font-bold tabular-nums">
            {(data.market_cap_percentage.btc ?? 0).toFixed(1)}%
          </span>
          <span className="text-sm text-muted-foreground tabular-nums">
            ETH {(data.market_cap_percentage.eth ?? 0).toFixed(1)}%
          </span>
        </>
      )}
    </StatCard>
  );
};

const MarketCapCard = (): React.ReactNode => {
  const { currency } = useCurrency();
  const { data, isLoading, isError } = useGlobal();
  if (isError) return null;

  return (
    <StatCard title="Total Market Cap">
      {isLoading || !data ? (
        <Skeleton className="h-12 w-full" />
      ) : (
        <>
          <span className="text-3xl font-bold tabular-nums">
            {formatCompact(data.total_market_cap[currency], currency)}
          </span>
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
              percentColorClass(data.market_cap_change_percentage_24h_usd),
            )}
          >
            {formatPercent(data.market_cap_change_percentage_24h_usd)} 24h
          </span>
        </>
      )}
    </StatCard>
  );
};

const GoldCard = (): React.ReactNode => {
  const money = useMoney();
  const { data: priceMap, isLoading, isError } = usePortfolioPrices([GOLD_ID]);
  const { data: chart } = useCoinChart(GOLD_ID, 7);

  // Gold is a bonus context card — if it fails, drop it rather than break the row.
  if (isError) return null;

  const gold = priceMap?.[GOLD_ID];
  const change = gold?.usd_24h_change;
  const series = chart?.map((p) => p.price) ?? [];
  // 7-day trend derived from the same chart series that draws the sparkline.
  const change7d =
    series.length > 1
      ? (series[series.length - 1] / series[0] - 1) * 100
      : undefined;

  return (
    <StatCard title="Gold · PAXG">
      {isLoading || !gold ? (
        <Skeleton className="h-12 w-full" />
      ) : (
        <>
          <span className="text-3xl font-bold tabular-nums">
            {money.format(gold.usd)}
          </span>
          <div className="flex items-center gap-3 text-sm font-medium tabular-nums">
            <span className={percentColorClass(change)}>
              {formatPercent(change)}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                24h
              </span>
            </span>
            {change7d !== undefined ? (
              <span className={percentColorClass(change7d)}>
                {formatPercent(change7d)}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  7d
                </span>
              </span>
            ) : null}
          </div>
        </>
      )}
    </StatCard>
  );
};
