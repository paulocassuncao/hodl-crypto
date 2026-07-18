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

import type { BacktestEquityPoint } from "@/lib/backtest";
import { formatCompact } from "@/lib/format";

const MAX_POINTS = 500;

/**
 * Evenly downsample the equity series for render only — metrics are computed
 * from the full arrays server-side, so thinning the drawn points (nearest
 * neighbour, always keeping the last) costs no accuracy in the numbers.
 */
export const downsample = (
  points: BacktestEquityPoint[],
  max = MAX_POINTS,
): BacktestEquityPoint[] => {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  const out: BacktestEquityPoint[] = [];
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)]);
  return out;
};

const formatDay = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });

// Strategy is the hero series — ink, not the accent (the accent is reserved for
// interaction, never data). Benchmarks read in categorical chart hues.
const SERIES: { key: keyof BacktestEquityPoint; label: string; color: string; width: number }[] = [
  { key: "strategy", label: "Strategy", color: "var(--foreground)", width: 2 },
  { key: "buyHold", label: "Buy & hold", color: "var(--chart-1)", width: 1 },
  { key: "dca", label: "DCA", color: "var(--chart-2)", width: 1 },
];

/**
 * Backtest equity curve: the strategy against buy-and-hold and DCA benchmarks,
 * all starting from the same fictitious capital. Reuses the sleeve chart's
 * recharts setup.
 */
export const BacktestEquityChart = ({
  equity,
}: {
  equity: BacktestEquityPoint[];
}): React.ReactNode => {
  const data = downsample(equity);
  return (
    <div
      className="chart-glow h-72 w-full"
      role="img"
      aria-label="Backtest equity curve: strategy vs buy-and-hold vs DCA"
    >
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="timeMs"
            tickFormatter={formatDay}
            tick={{ fontSize: 11 }}
            minTickGap={56}
          />
          <YAxis
            tickFormatter={(v: number) => formatCompact(v, "usd")}
            tick={{ fontSize: 11 }}
            width={64}
            domain={["auto", "auto"]}
          />
          <Tooltip
            formatter={(value, name) => [
              formatCompact(Number(value), "usd"),
              SERIES.find((s) => s.key === name)?.label ?? String(name),
            ]}
            labelFormatter={(ms) =>
              new Date(Number(ms)).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            }
          />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={s.width}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
