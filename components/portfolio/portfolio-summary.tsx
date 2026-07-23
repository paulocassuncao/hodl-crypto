"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";

import { Sparkline } from "@/components/market-table/sparkline";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarkets } from "@/hooks/use-markets";
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
  const { data: markets } = useMarkets();
  const totals = portfolioTotals(positions, prices);
  const alloc = allocations(positions, prices).filter((a) => a.value > 0);

  // The portfolio's real 7-day value curve: sum (quantity × each holding's own
  // 7d price series), index-aligned across positions. Fills the hero's base like
  // the market hero's BTC line — atmosphere drawn from real data, never faked.
  // Holdings outside the top-100 markets have no sparkline and are simply absent
  // from the shape; with none available the hero renders flat (no line).
  const valueSpark = useMemo(() => {
    if (!markets) return [];
    const series = positions
      .map((p) => {
        const spark = markets.find((c) => c.id === p.coinId)?.sparkline_in_7d
          ?.price;
        return spark && spark.length > 1 ? { qty: p.quantity, spark } : null;
      })
      .filter((s): s is { qty: number; spark: number[] } => s !== null);
    if (series.length === 0) return [];
    const len = Math.min(...series.map((s) => s.spark.length));
    return Array.from({ length: len }, (_, i) =>
      series.reduce((sum, s) => sum + s.qty * s.spark[i], 0),
    );
  }, [markets, positions]);

  // Signed amount with an explicit +/− sign, formatted in the active currency.
  const signed = (value: number): string => {
    const sign = value > 0 ? "+" : value < 0 ? "−" : "";
    return `${sign}${money.format(Math.abs(value))}`;
  };

  const up = totals.pnl >= 0;
  // A closed-out ledger renders here too (value 0, P&L exactly 0). Flat is not
  // a gain — the beacon follows the same rule as `percentColorClass`.
  const beaconTone =
    totals.pnl === 0 ? "text-muted-foreground" : up ? "text-gain" : "text-loss";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Hero — total value + unrealized P&L */}
      <div className="glass-panel relative overflow-hidden rounded-2xl p-6 sm:p-7">
        {/* Living pulse — the portfolio's real 7-day value curve, behind the figure. */}
        {valueSpark.length > 1 ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-0 opacity-80 [mask-image:linear-gradient(90deg,transparent,#000_18%)]"
          >
            {/* Colored by the P&L sign, not the line's own 7d direction, so the
                line agrees with the number + beacon instead of glowing green
                behind a red loss. */}
            <Sparkline
              prices={valueSpark}
              width={720}
              height={96}
              color={up ? "var(--gain)" : "var(--loss)"}
            />
            <span className="absolute right-3 bottom-2 font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase">
              Value · 7d
            </span>
          </div>
        ) : null}

        <div className="relative z-10">
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
              className={cn("size-2 rounded-full bg-current", beaconTone)}
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
            <span className="text-sm text-muted-foreground">
              unrealized P&amp;L
            </span>
          </div>
        </div>
      </div>

      {/* Secondary figures + allocation */}
      <div className="grid grid-cols-2 gap-4">
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
