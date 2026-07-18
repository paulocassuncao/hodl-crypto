"use client";

import dynamic from "next/dynamic";

/**
 * Client boundary that lazy-loads the sleeve equity chart (and its recharts
 * chunk) with `ssr: false`, mirroring fear-greed-gauge.lazy.tsx: the chart is
 * secondary content, so deferring it keeps recharts out of the route's
 * initial JS. The fallback matches the chart's footprint.
 */
export const SleeveEquityChart = dynamic(
  () =>
    import("@/components/sleeve/sleeve-equity-chart").then(
      (m) => m.SleeveEquityChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-xl glass-panel" />
    ),
  },
);
