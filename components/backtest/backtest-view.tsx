"use client";

import { useState } from "react";

import { FlaskConical } from "lucide-react";

import { BacktestEquityChart } from "@/components/backtest/backtest-equity-chart.lazy";
import { SignalFeed, type SignalFeedItem } from "@/components/signal-feed";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BACKTEST_PERIODS,
  type BacktestPeriod,
  type BacktestReport,
  type ClosedRoundTrip,
} from "@/lib/backtest";
import {
  formatCurrency,
  formatPercent,
  percentColorClass,
} from "@/lib/format";
import { useBacktest, type BacktestAsset } from "@/hooks/use-backtest";
import { cn } from "@/lib/utils";

const ASSETS: BacktestAsset[] = ["BTC", "ETH"];

/** Render a [0,1)-ish fraction as a signed percentage. */
const pct = (frac: number): string => formatPercent(frac * 100);

const formatDate = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const toFeedItems = (report: BacktestReport): SignalFeedItem[] =>
  report.events
    .map((e) => ({
      key: `${e.asset}-${e.timeMs}-${e.strategy}`,
      timeMs: e.timeMs,
      asset: e.asset,
      strategy: e.strategy,
      signalAfter: e.signalAfter,
      reason: e.reason,
    }))
    .reverse(); // newest first

/** Small pill-style selector shared by the asset and period toggles. */
const Segmented = <T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}): React.ReactNode => (
  <div
    role="group"
    aria-label={ariaLabel}
    className="inline-flex rounded-lg border bg-card p-0.5"
  >
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        aria-pressed={o.value === value}
        onClick={() => onChange(o.value)}
        className={cn(
          "rounded-md px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          o.value === value
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const MetricsGrid = ({ report }: { report: BacktestReport }): React.ReactNode => {
  const { metrics, benchmarks } = report;
  const cells: { label: string; value: string; className?: string }[] = [
    {
      label: "Total return",
      value: pct(metrics.totalReturn),
      className: percentColorClass(metrics.totalReturn),
    },
    {
      label: "Max drawdown",
      value: pct(metrics.maxDrawdown),
      className: percentColorClass(metrics.maxDrawdown),
    },
    { label: "Sharpe", value: metrics.sharpe.toFixed(2) },
    { label: "Trades", value: String(metrics.nTrades) },
    {
      label: "Final equity",
      value: formatCurrency(metrics.finalEquity, "usd"),
    },
    {
      label: "Buy & hold return",
      value: pct(benchmarks.buyHold.totalReturn),
      className: percentColorClass(benchmarks.buyHold.totalReturn),
    },
    {
      label: "DCA return",
      value: pct(benchmarks.dca.totalReturn),
      className: percentColorClass(benchmarks.dca.totalReturn),
    },
    {
      label: "vs buy & hold",
      value: pct(metrics.totalReturn - benchmarks.buyHold.totalReturn),
      className: percentColorClass(
        metrics.totalReturn - benchmarks.buyHold.totalReturn,
      ),
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
      {cells.map((c) => (
        <div key={c.label} className="bg-card p-3">
          <div className="text-xs text-muted-foreground">{c.label}</div>
          <div
            className={cn(
              "mt-1 text-sm font-semibold tabular-nums",
              c.className,
            )}
          >
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
};

const RoundTripsTable = ({
  trips,
}: {
  trips: ClosedRoundTrip[];
}): React.ReactNode => {
  if (trips.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        No closed round-trips in this window.
      </div>
    );
  }
  return (
    <div className="max-h-96 overflow-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entry</TableHead>
            <TableHead>Exit</TableHead>
            <TableHead className="text-right">Days</TableHead>
            <TableHead className="text-right">Entry px</TableHead>
            <TableHead className="text-right">Exit px</TableHead>
            <TableHead className="text-right">P&amp;L</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...trips].reverse().map((t) => (
            <TableRow key={t.entryTimeMs}>
              <TableCell className="whitespace-nowrap">
                {formatDate(t.entryTimeMs)}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatDate(t.exitTimeMs)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {t.holdingDays}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(t.entryPrice, "usd")}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(t.exitPrice, "usd")}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums",
                  percentColorClass(t.pnl),
                )}
              >
                {formatCurrency(t.pnl, "usd")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

/**
 * Historical backtest of the deployed sleeve ensemble. In-sample / past data —
 * kept entirely separate from the live paper Sleeve (never writes sleeve
 * state). Pick an asset and a period; everything is fictitious capital.
 */
export const BacktestView = (): React.ReactNode => {
  const [asset, setAsset] = useState<BacktestAsset>("BTC");
  const [period, setPeriod] = useState<BacktestPeriod>("3y");
  const { data, isLoading, error } = useBacktest(asset, period);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          Backtest
          <Badge variant="outline" className="gap-1">
            <FlaskConical aria-hidden />
            historical · in-sample
          </Badge>
        </h1>
        <p className="text-sm text-muted-foreground">
          The deployed trend ensemble (EMA 20/50/200 + Donchian 20/10, vol
          target 0.6) simulated over past data, against buy &amp; hold and DCA.
          Past results don&apos;t guarantee future ones. Costs modeled: 0.10%
          fee + 0.05% slippage per trade. Fictitious capital — not the live
          Sleeve.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={asset}
          options={ASSETS.map((a) => ({ value: a, label: a }))}
          onChange={setAsset}
          ariaLabel="Asset"
        />
        <Segmented
          value={period}
          options={BACKTEST_PERIODS}
          onChange={setPeriod}
          ariaLabel="Period"
        />
      </div>

      {error ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          Couldn&apos;t run the backtest: {error.message}
        </div>
      ) : isLoading || !data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <MetricsGrid report={data} />

          <section className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Equity curve — {data.asset}, {data.bars.toLocaleString()} daily
              bars from {formatDate(data.startTimeMs)}
            </h2>
            <div className="rounded-xl border bg-card p-4">
              <BacktestEquityChart equity={data.equity} />
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Closed round-trips ({data.roundTripStats.count}) · win rate{" "}
              {(data.roundTripStats.winRate * 100).toFixed(0)}%
            </h2>
            <RoundTripsTable trips={data.roundTrips} />
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Signal events ({data.events.length})
            </h2>
            <SignalFeed
              items={toFeedItems(data)}
              emptyLabel="No signal flips in this window."
            />
          </section>
        </>
      )}
    </div>
  );
};
