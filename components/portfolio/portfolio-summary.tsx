"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import { useMoney } from "@/hooks/use-money";
import { formatPercent, percentColorClass } from "@/lib/format";
import {
  allocations,
  portfolioTotals,
  type PriceMap,
} from "@/lib/portfolio-core";
import type { Position } from "@/lib/types";
import { cn } from "@/lib/utils";

// Donut split out and deferred so recharts stays out of the portfolio's initial
// chunk; the totals and legend render eagerly while the donut fills in behind a
// matching round skeleton.
const PortfolioAllocationDonut = dynamic(
  () =>
    import("@/components/portfolio/portfolio-allocation-donut").then(
      (m) => m.PortfolioAllocationDonut,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="size-[120px] shrink-0 rounded-full" />,
  },
);

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** A compact glass tile for a secondary portfolio figure. */
const Tile = ({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: number;
}): React.ReactNode => (
  <div className="glass-panel rounded-xl px-4 py-3">
    <div className="text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
      {label}
    </div>
    <div
      className={cn(
        "mt-1 font-mono text-lg font-semibold tabular-nums",
        percentColorClass(tone),
      )}
    >
      {value}
    </div>
    {sub ? (
      <div className={cn("font-mono text-xs tabular-nums", percentColorClass(tone))}>
        {sub}
      </div>
    ) : null}
  </div>
);

interface PortfolioSummaryProps {
  positions: Position[];
  prices: PriceMap;
  /** Maps a coinId to its display symbol for the allocation legend. */
  symbolFor: (coinId: string) => string;
}

/**
 * The living hero of the Portfolio: total value at display scale with a glow,
 * unrealized P&L with a pulsing beacon, the secondary figures as glass tiles,
 * and the allocation donut on glass.
 */
export const PortfolioSummary = ({
  positions,
  prices,
  symbolFor,
}: PortfolioSummaryProps): React.ReactNode => {
  const money = useMoney();
  const totals = portfolioTotals(positions, prices);
  const alloc = allocations(positions, prices).filter((a) => a.value > 0);

  // Signed amount with an explicit +/− sign, formatted in the active currency.
  const signed = (value: number): string => {
    const sign = value > 0 ? "+" : value < 0 ? "−" : "";
    return `${sign}${money.format(Math.abs(value))}`;
  };

  const up = totals.pnl >= 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
      {/* Hero — total value + unrealized P&L */}
      <div className="glass-panel relative overflow-hidden rounded-2xl p-6 sm:p-7">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Total Value
        </div>
        <div
          className="mt-2 font-display text-5xl font-extrabold leading-none tracking-tight tabular-nums sm:text-6xl"
          style={{ textShadow: "0 0 44px var(--glow-accent)" }}
        >
          {money.format(totals.value)}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
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
              percentColorClass(totals.pnl),
            )}
          >
            {signed(totals.pnl)}
          </span>
          <span
            className={cn(
              "font-mono text-sm tabular-nums",
              percentColorClass(totals.pnl),
            )}
          >
            {formatPercent(totals.pnlPct)}
          </span>
          <span className="text-sm text-muted-foreground">unrealized P&amp;L</span>
        </div>
      </div>

      {/* Secondary figures + allocation */}
      <div className="grid grid-cols-2 gap-3">
        <Tile
          label="Realized P&L"
          value={signed(totals.realized)}
          sub={
            totals.realizedCost > 0
              ? formatPercent(totals.realizedPct)
              : undefined
          }
          tone={totals.realized}
        />
        <Tile
          label="24h Change"
          value={signed(totals.change24h)}
          sub={formatPercent(totals.change24hPct)}
          tone={totals.change24h}
        />
        {alloc.length > 0 ? (
          <div className="glass-panel col-span-2 flex items-center gap-4 rounded-xl p-4">
            <PortfolioAllocationDonut data={alloc} colors={CHART_COLORS} />
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
                  <span className="ml-auto font-mono tabular-nums">
                    {a.pct.toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
};
