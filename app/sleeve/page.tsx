import { Suspense } from "react";

import type { Metadata } from "next";

import { StrategyView } from "@/components/strategy/strategy-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Strategy — HODL",
  description:
    "Systematic trend ensemble on fictitious capital: the paper sleeve running forward, and its historical backtest.",
};

/** StrategyView reads the active lens from the URL, so it renders under Suspense. */
const StrategyPage = (): React.ReactNode => (
  <Suspense fallback={<Skeleton className="min-h-[70vh] w-full rounded-lg" />}>
    <StrategyView />
  </Suspense>
);

export default StrategyPage;
