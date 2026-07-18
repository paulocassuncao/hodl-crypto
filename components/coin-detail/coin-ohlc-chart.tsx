"use client";

import { useState } from "react";

import {
  Bar,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCoinOhlc } from "@/hooks/use-coin-ohlc";
import { candleDomain, candleGeometry, type Candle } from "@/lib/candles";
import { useCurrency } from "@/lib/currency";
import { formatCurrency } from "@/lib/format";
import type { OHLCPoint } from "@/lib/types";

const RANGES = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "1y", days: 365 },
] as const;

/** Props Recharts passes to a Bar's custom `shape`. */
interface CandleShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: OHLCPoint;
}

/** A single candlestick: high-low wick plus an open-close body. */
const Candlestick = ({
  x,
  y,
  width,
  height,
  payload,
}: CandleShapeProps): React.ReactNode => {
  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined ||
    !payload
  ) {
    return null;
  }
  const g = candleGeometry(payload as Candle, { x, y, width, height });
  return (
    <g>
      <line
        x1={g.wickX}
        x2={g.wickX}
        y1={g.wickTop}
        y2={g.wickBottom}
        stroke={g.color}
        strokeWidth={1}
      />
      <rect
        x={g.bodyX}
        y={g.bodyY}
        width={g.bodyWidth}
        height={g.bodyHeight}
        fill={g.color}
      />
    </g>
  );
};

interface CandleTooltipProps {
  active?: boolean;
  payload?: { payload: OHLCPoint }[];
  currency: Parameters<typeof formatCurrency>[1];
  formatTime: (value: number) => string;
}

const CandleTooltip = ({
  active,
  payload,
  currency,
  formatTime,
}: CandleTooltipProps): React.ReactNode => {
  if (!active || !payload?.length) return null;
  const c = payload[0].payload;
  const row = (label: string, value: number): React.ReactNode => (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{formatCurrency(value, currency)}</span>
    </div>
  );
  return (
    <div className="rounded-lg border bg-popover p-2 text-xs text-popover-foreground shadow-sm">
      <div className="mb-1 font-medium">{formatTime(c.time)}</div>
      {row("Open", c.open)}
      {row("High", c.high)}
      {row("Low", c.low)}
      {row("Close", c.close)}
    </div>
  );
};

/** Interactive candlestick (OHLC) chart with selectable time ranges. */
export const CoinOhlcChart = ({ id }: { id: string }): React.ReactNode => {
  const [days, setDays] = useState<number>(7);
  const { currency } = useCurrency();
  const { data, isLoading } = useCoinOhlc(id, days);

  const formatTime = (value: number): string =>
    new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(days <= 1 ? { hour: "2-digit" } : {}),
    });

  return (
    <div className="space-y-4 rounded-lg glass-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          Candlestick Chart
        </h2>
        <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <TabsList>
            {RANGES.map((r) => (
              <TabsTrigger key={r.days} value={String(r.days)}>
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-[320px] w-full" />
      ) : data.length === 0 ? (
        <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
          No candle data for this range.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
          >
            <XAxis
              dataKey="time"
              tickFormatter={formatTime}
              minTickGap={48}
              tick={{ fontSize: 12 }}
              stroke="var(--muted-foreground)"
            />
            <YAxis
              domain={candleDomain(data as Candle[])}
              tickFormatter={(v: number) => formatCurrency(v, currency)}
              width={80}
              tick={{ fontSize: 12 }}
              stroke="var(--muted-foreground)"
            />
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              content={
                <CandleTooltip currency={currency} formatTime={formatTime} />
              }
            />
            <Bar
              dataKey={(d: OHLCPoint) => [d.low, d.high]}
              shape={<Candlestick />}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
