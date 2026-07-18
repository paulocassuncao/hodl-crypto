"use client";

import dynamic from "next/dynamic";

/**
 * Client boundary that lazy-loads the backtest equity chart (and its recharts
 * chunk) with `ssr: false`, mirroring sleeve-equity-chart.lazy.tsx — keeps
 * recharts out of the route's initial JS. The fallback matches the chart's
 * footprint.
 */
export const BacktestEquityChart = dynamic(
  () =>
    import("@/components/backtest/backtest-equity-chart").then(
      (m) => m.BacktestEquityChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 w-full animate-pulse rounded-xl glass-panel" />
    ),
  },
);
