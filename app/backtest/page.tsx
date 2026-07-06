import type { Metadata } from "next";

import { BacktestView } from "@/components/backtest/backtest-view";

export const metadata: Metadata = {
  title: "Backtest — HODL",
  description:
    "Historical backtest of the systematic trend ensemble against buy & hold and DCA benchmarks.",
};

const BacktestPage = (): React.ReactNode => <BacktestView />;

export default BacktestPage;
