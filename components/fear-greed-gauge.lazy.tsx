"use client";

import dynamic from "next/dynamic";

/**
 * Client boundary that lazy-loads the Fear & Greed gauge (and the recharts chunk
 * it pulls in) with `ssr: false`. The gauge is a secondary homepage widget that
 * already renders a skeleton while its own data loads, so deferring it keeps
 * recharts out of the most-visited route's initial JS with no UX cost. The
 * fallback borrows the Card's chrome (rounded-xl + hairline border) and fills
 * its grid cell, so it reads as the same placeholder as its bordered neighbours
 * (Trending, Gainers, Losers) rather than a borderless block during the swap.
 */
export const FearGreedGauge = dynamic(
  () => import("@/components/fear-greed-gauge").then((m) => m.FearGreedGauge),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[206px] w-full animate-pulse rounded-xl border bg-card" />
    ),
  },
);
