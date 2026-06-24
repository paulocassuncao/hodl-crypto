"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveContainer, Treemap } from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMarkets } from "@/hooks/use-markets";
import { useCurrency } from "@/lib/currency";
import { formatPercent } from "@/lib/format";
import { heatColor } from "@/lib/heat";
import type { Coin, Currency } from "@/lib/types";

type Timeframe = "1h" | "24h" | "7d";

const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: "1h", label: "1h" },
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
];

/** Pick the percentage-change field for the selected timeframe. */
const changeFor = (coin: Coin, tf: Timeframe): number | null => {
  if (tf === "1h") return coin.price_change_percentage_1h_in_currency;
  if (tf === "7d") return coin.price_change_percentage_7d_in_currency;
  return coin.price_change_percentage_24h_in_currency;
};

interface HeatNode {
  id: string;
  name: string;
  symbol: string;
  size: number;
  pct: number | null;
  price: number;
  // Recharts' TreemapDataType requires an index signature.
  [key: string]: string | number | null;
}

interface CellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  depth?: number;
  id?: string;
  symbol?: string;
  pct?: number | null;
  currency?: Currency;
  onNavigate?: (id: string) => void;
}

/** Single treemap tile: colored by % change, navigates to the coin on click. */
const HeatCell = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  depth = 0,
  id,
  symbol,
  pct,
  onNavigate,
}: CellProps): React.ReactNode => {
  // Recharts renders a root container node (depth 0) plus leaf tiles (depth 1).
  if (depth !== 1 || !id) return null;

  const showText = width > 44 && height > 26;
  const showPct = width > 56 && height > 40;

  return (
    <g
      onClick={() => onNavigate?.(id)}
      style={{ cursor: "pointer" }}
      role="link"
      aria-label={symbol}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={heatColor(pct)}
        stroke="var(--background)"
        strokeWidth={2}
        rx={4}
      />
      {/* White labels are intentional: tiles are always saturated gain/loss
          colors (a data encoding, not a themeable surface), so the label color
          is fixed white for contrast in both themes rather than a token. */}
      {showText ? (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showPct ? 7 : 0)}
          textAnchor="middle"
          fill="#fff"
          fontSize={Math.min(16, Math.max(10, width / 6))}
          fontWeight={600}
        >
          {symbol?.toUpperCase()}
        </text>
      ) : null}
      {showPct ? (
        <text
          x={x + width / 2}
          y={y + height / 2 + 11}
          textAnchor="middle"
          fill="rgba(255,255,255,0.85)"
          fontSize={11}
        >
          {formatPercent(pct ?? 0)}
        </text>
      ) : null}
    </g>
  );
};

/** Treemap of the top 100 coins, sized by market cap, colored by % change. */
export const MarketHeatmap = (): React.ReactNode => {
  const router = useRouter();
  const { currency } = useCurrency();
  const { data: coins, isLoading, isError, error } = useMarkets();
  const [timeframe, setTimeframe] = useState<Timeframe>("24h");

  const data = useMemo<HeatNode[]>(
    () =>
      (coins ?? [])
        .filter((c) => c.market_cap > 0)
        .map((c) => ({
          id: c.id,
          name: c.name,
          symbol: c.symbol,
          size: c.market_cap,
          pct: changeFor(c, timeframe),
          price: c.current_price,
        })),
    [coins, timeframe],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Market Heatmap</h1>
          <p className="text-sm text-muted-foreground">
            Top 100 by market cap · tile size = market cap · color ={" "}
            {timeframe} change
          </p>
        </div>
        <Tabs
          value={timeframe}
          onValueChange={(v) => setTimeframe(v as Timeframe)}
        >
          <TabsList>
            {TIMEFRAMES.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isError ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load market data."}
        </div>
      ) : isLoading || data.length === 0 ? (
        <Skeleton className="h-[600px] w-full rounded-lg" />
      ) : (
        <div className="h-[600px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={data}
              dataKey="size"
              isAnimationActive={false}
              content={
                <HeatCell
                  currency={currency}
                  onNavigate={(id) => router.push(`/coins/${id}`)}
                />
              }
            />
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};
