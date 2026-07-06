"use client";

import { useState } from "react";

import { FlaskConical, Hourglass, TriangleAlert } from "lucide-react";

import { SleeveEquityChart } from "@/components/sleeve/sleeve-equity-chart.lazy";
import { SleeveSignalCard } from "@/components/sleeve/sleeve-signal-card";
import { SleeveSignalFeed } from "@/components/sleeve/sleeve-signal-feed";
import { SleeveTradesTable } from "@/components/sleeve/sleeve-trades-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSleeve, useSleeveSignalEvents } from "@/hooks/use-sleeve";
import { formatCurrency, formatPercent, percentColorClass } from "@/lib/format";
import type { SleeveStateRow } from "@/lib/supabase/types";

/**
 * Trading-sleeve page body: a PAPER simulation on fictitious capital, kept
 * deliberately separate from the real-money portfolio — its dollars are never
 * summed into net worth, and every figure is labelled as paper. (Do not
 * import anything from lib/portfolio* here, or sleeve components there.)
 */

/** Human position summary, e.g. "cash", "long 0.42x". */
const exposureLabel = (position: number): string =>
  position < 0.005 ? "cash" : `long ${position.toFixed(2)}x`;

const DAY_MS = 86_400_000;

/**
 * The cron advances one bar per day, so a healthy account's last bar is at
 * most ~2 days old (yesterday's bar plus timing slack). Older than that means
 * the daily job has silently stopped — surface it instead of showing a
 * quietly frozen curve.
 */
export const isStale = (lastTimeMs: number, nowMs: number): boolean =>
  nowMs - lastTimeMs > 2 * DAY_MS;

const AssetCard = ({ state }: { state: SleeveStateRow }): React.ReactNode => {
  const invested = state.position >= 0.005;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between text-base">
          <span>{state.asset}</span>
          <span
            className={
              invested
                ? "text-gain-ink text-sm"
                : "text-muted-foreground text-sm"
            }
          >
            {exposureLabel(state.position)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cash</span>
          <span>{formatCurrency(state.cash, "usd")}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Units</span>
          <span>{state.units.toFixed(6)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Allocation</span>
          <span>{formatCurrency(state.allocation, "usd")} paper</span>
        </div>
      </CardContent>
    </Card>
  );
};

export const SleeveView = (): React.ReactNode => {
  const { data, isLoading, error } = useSleeve();
  const { data: signalEvents } = useSleeveSignalEvents();
  // Captured once on mount — staleness is judged in days, so it doesn't need
  // to tick (and Date.now() during render violates react-hooks/purity).
  const [mountedAtMs] = useState(() => Date.now());

  const states = data?.states ?? [];
  const trades = data?.trades ?? [];
  const equity = data?.equity ?? [];

  const totalAllocation = states.reduce((s, r) => s + r.allocation, 0);
  const latestByAsset = new Map<string, number>();
  for (const p of equity) latestByAsset.set(p.asset, p.equity);
  const currentEquity =
    latestByAsset.size > 0
      ? [...latestByAsset.values()].reduce((s, v) => s + v, 0)
      : totalAllocation;
  const pnl = currentEquity - totalAllocation;
  const pnlPct = totalAllocation > 0 ? (pnl / totalAllocation) * 100 : 0;

  const oldestLastBar =
    states.length > 0 ? Math.min(...states.map((s) => s.last_time_ms)) : null;
  const stale = oldestLastBar !== null && isStale(oldestLastBar, mountedAtMs);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            Trading Sleeve
            <Badge variant="outline" className="gap-1">
              <FlaskConical aria-hidden />
              paper · validating
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            Systematic trend ensemble (EMA 20/50/200 + Donchian 20/10, vol
            target 0.6) running forward on fictitious capital. Not real money —
            never counted in your net worth.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          Couldn&apos;t load the sleeve: {error.message}
        </div>
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : states.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-12 text-center">
          <Hourglass className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Sleeve not initialized yet</p>
            <p className="text-sm text-muted-foreground">
              The daily job will bootstrap both assets in cash on its first run;
              positions open when the trend turns up.
            </p>
          </div>
        </div>
      ) : (
        <>
          {stale ? (
            <div
              role="status"
              className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning-ink"
            >
              <TriangleAlert className="size-4 shrink-0" aria-hidden />
              <span>
                Simulation stalled — last processed bar is{" "}
                {new Date(oldestLastBar!).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
                . The daily job may be failing; check the Vercel cron logs.
              </span>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Paper equity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {formatCurrency(currentEquity, "usd")}
                </p>
                <p className="text-xs text-muted-foreground">
                  of {formatCurrency(totalAllocation, "usd")} fictitious
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Paper P&L</CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-2xl font-semibold ${percentColorClass(pnlPct)}`}
                >
                  {formatCurrency(pnl, "usd")}
                </p>
                <p className={`text-xs ${percentColorClass(pnlPct)}`}>
                  {formatPercent(pnlPct)}
                </p>
              </CardContent>
            </Card>
            {states.map((s) => (
              <AssetCard key={s.asset} state={s} />
            ))}
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Signals
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {states.map((s) => (
                <SleeveSignalCard key={s.asset} state={s} />
              ))}
            </div>
          </section>

          {equity.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                Equity curve (paper)
              </h2>
              <div className="rounded-xl border bg-card p-4">
                <SleeveEquityChart rows={equity} />
              </div>
            </section>
          ) : null}

          <section className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Signal events
            </h2>
            <SleeveSignalFeed events={signalEvents ?? []} />
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Simulated trades
            </h2>
            {trades.length === 0 ? (
              <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
                In cash, waiting for the trend — no simulated fills yet.
              </div>
            ) : (
              <SleeveTradesTable trades={trades} events={signalEvents ?? []} />
            )}
          </section>
        </>
      )}
    </div>
  );
};
