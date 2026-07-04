"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency } from "@/lib/format";
import type { SleeveEquityRow } from "@/lib/supabase/types";

interface ChartPoint {
  timeMs: number;
  /** Combined equity (sum of per-asset equity at this bar). */
  total: number;
  BTC?: number;
  ETH?: number;
}

/** Merge per-asset equity rows into one combined + per-asset series. */
export const toChartSeries = (rows: SleeveEquityRow[]): ChartPoint[] => {
  const byTime = new Map<number, ChartPoint>();
  for (const row of rows) {
    const point = byTime.get(row.time_ms) ?? { timeMs: row.time_ms, total: 0 };
    point.total += row.equity;
    if (row.asset === "BTC" || row.asset === "ETH")
      point[row.asset] = row.equity;
    byTime.set(row.time_ms, point);
  }
  return [...byTime.values()].sort((a, b) => a.timeMs - b.timeMs);
};

const formatDay = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/**
 * Forward equity curve of the paper sleeve — combined line plus one thinner
 * line per asset. Fictitious dollars only; never mixed with real balances.
 */
export const SleeveEquityChart = ({
  rows,
}: {
  rows: SleeveEquityRow[];
}): React.ReactNode => {
  const data = toChartSeries(rows);
  return (
    <div className="h-64 w-full" role="img" aria-label="Sleeve equity curve">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="timeMs"
            tickFormatter={formatDay}
            tick={{ fontSize: 11 }}
            minTickGap={48}
          />
          <YAxis
            tickFormatter={(v: number) => formatCurrency(v, "usd")}
            tick={{ fontSize: 11 }}
            width={72}
            domain={["auto", "auto"]}
          />
          <Tooltip
            formatter={(value, name) => [
              formatCurrency(Number(value), "usd"),
              name === "total" ? "Combined" : String(name),
            ]}
            labelFormatter={(ms) => formatDay(Number(ms))}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="BTC"
            stroke="var(--chart-1)"
            strokeWidth={1}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="ETH"
            stroke="var(--chart-2)"
            strokeWidth={1}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
