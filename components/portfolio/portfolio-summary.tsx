"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { formatCurrency, formatPercent, percentColorClass } from "@/lib/format";
import {
  allocations,
  portfolioTotals,
  type PriceMap,
} from "@/lib/portfolio-core";
import type { Position } from "@/lib/types";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** Format a signed USD amount with an explicit +/− sign. */
const signedUsd = (value: number): string => {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatCurrency(Math.abs(value), "usd")}`;
};

interface PortfolioSummaryProps {
  positions: Position[];
  prices: PriceMap;
  /** Maps a coinId to its display symbol for the allocation legend. */
  symbolFor: (coinId: string) => string;
}

/** Headline totals (value, P&L, realized, 24h) plus an allocation donut. */
export const PortfolioSummary = ({
  positions,
  prices,
  symbolFor,
}: PortfolioSummaryProps): React.ReactNode => {
  const totals = portfolioTotals(positions, prices);
  const alloc = allocations(positions, prices).filter((a) => a.value > 0);

  const stats: {
    label: string;
    value: string;
    sub?: string;
    tone: number;
    muted?: boolean;
  }[] = [
    {
      label: "Total Value",
      value: formatCurrency(totals.value, "usd"),
      tone: 0,
      muted: true,
    },
    {
      label: "Unrealized P&L",
      value: signedUsd(totals.pnl),
      sub: formatPercent(totals.pnlPct),
      tone: totals.pnl,
    },
    {
      label: "Realized P&L",
      value: signedUsd(totals.realized),
      sub: totals.realizedCost > 0 ? formatPercent(totals.realizedPct) : undefined,
      tone: totals.realized,
    },
    {
      label: "24h Change",
      value: signedUsd(totals.change24h),
      sub: formatPercent(totals.change24hPct),
      tone: totals.change24h,
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div
              className={cn(
                "mt-1 text-2xl font-semibold tabular-nums",
                s.muted ? "text-foreground" : percentColorClass(s.tone),
              )}
            >
              {s.value}
            </div>
            {s.sub ? (
              <div
                className={cn("text-sm tabular-nums", percentColorClass(s.tone))}
              >
                {s.sub}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {alloc.length > 0 ? (
        <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie
                data={alloc}
                dataKey="value"
                nameKey="coinId"
                innerRadius={38}
                outerRadius={58}
                strokeWidth={0}
                isAnimationActive={false}
              >
                {alloc.map((a, i) => (
                  <Cell
                    key={a.coinId}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <ul className="space-y-1 text-sm">
            {alloc.slice(0, 5).map((a, i) => (
              <li key={a.coinId} className="flex items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="uppercase text-muted-foreground">
                  {symbolFor(a.coinId)}
                </span>
                <span className="ml-auto tabular-nums">
                  {a.pct.toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};
