"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCoinCharts } from "@/hooks/use-coin-charts";
import { buildCompareData, COMPARE_COLORS } from "@/lib/compare";
import { formatPercent } from "@/lib/format";

interface CompareCoin {
  id: string;
  symbol: string;
}

const RANGES: { label: string; days: number }[] = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "1y", days: 365 },
];

const formatTime = (value: number, days: number): string =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    ...(days <= 1 ? { hour: "2-digit", minute: "2-digit" } : {}),
  });

/** Overlaid, normalized (% from start) price chart for the compared coins. */
export const CompareChart = ({
  coins,
}: {
  coins: CompareCoin[];
}): React.ReactNode => {
  const [days, setDays] = useState<number>(7);
  const queries = useCoinCharts(
    coins.map((c) => c.id),
    days,
  );

  const isLoading = queries.some((q) => q.isLoading);

  const data = useMemo(
    () =>
      buildCompareData(
        coins.map((c, i) => ({ id: c.id, points: queries[i]?.data ?? [] })),
      ),
    [coins, queries],
  );

  return (
    <div className="chart-glow glass-panel space-y-3 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Performance (% change)
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

      {isLoading || data.length === 0 ? (
        <Skeleton className="h-[340px] w-full" />
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="time"
              tickFormatter={(v: number) => formatTime(v, days)}
              minTickGap={48}
              tick={{ fontSize: 12 }}
              stroke="var(--muted-foreground)"
            />
            <YAxis
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              width={56}
              tick={{ fontSize: 12 }}
              stroke="var(--muted-foreground)"
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
              labelFormatter={(v) => formatTime(Number(v), days)}
              formatter={(value, name) => {
                const coin = coins.find((c) => c.id === name);
                return [
                  formatPercent(Number(value)),
                  coin?.symbol.toUpperCase() ?? String(name),
                ];
              }}
            />
            {coins.map((c, i) => (
              <Line
                key={c.id}
                type="monotone"
                dataKey={c.id}
                stroke={COMPARE_COLORS[i % COMPARE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="flex flex-wrap gap-4">
        {coins.map((c, i) => (
          <div key={c.id} className="flex items-center gap-1.5 text-sm">
            <span
              className="inline-block size-3 rounded-full"
              style={{ background: COMPARE_COLORS[i % COMPARE_COLORS.length] }}
            />
            <span className="uppercase">{c.symbol}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
