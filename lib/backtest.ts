/**
 * Backtest report orchestrator: assembles the historical performance of the
 * deployed sleeve ensemble (EMA 20/50/200 + Donchian 20/10, vol target 0.6)
 * from already-fetched candles. Pure (no I/O) so it unit-tests directly; the
 * `/api/backtest/run` route fetches the candles and calls this.
 *
 * Everything reuses the parity-locked engine — `ensembleTarget`, `runBacktest`,
 * `buyAndHold`, `dcaBenchmark`, `computeSignalFlips`. Nothing here re-derives
 * strategy numbers.
 */

import {
  buyAndHold,
  dcaBenchmark,
  runBacktest,
  type BenchmarkResult,
} from "@/lib/strategy/backtest";
import { computeSignalFlips, type SignalFlipEvent } from "@/lib/strategy/attribution";
import { ensembleTarget } from "@/lib/strategy/ensemble";
import type { BacktestResult, Candle } from "@/lib/strategy/types";

const DAY_MS = 86_400_000;
const TARGET_VOL = 0.6;
const START_CASH = 1000;

export type BacktestPeriod = "1y" | "3y" | "5y" | "max";

export const BACKTEST_PERIODS: { value: BacktestPeriod; label: string }[] = [
  { value: "1y", label: "1Y" },
  { value: "3y", label: "3Y" },
  { value: "5y", label: "5Y" },
  { value: "max", label: "Max" },
];

/** One combined equity point across the strategy and its benchmarks. */
export interface BacktestEquityPoint {
  timeMs: number;
  strategy: number;
  buyHold: number;
  dca: number;
}

/**
 * A closed long round-trip: from the first bar the ensemble deploys (target
 * leaves 0) to the bar it returns flat (target back to 0). Prices are bar
 * opens (next-open execution); `pnl` is the engine's booked P&L for the trip.
 */
export interface ClosedRoundTrip {
  entryTimeMs: number;
  exitTimeMs: number;
  holdingDays: number;
  entryPrice: number;
  exitPrice: number;
  /** Dollar P&L from runBacktest.trades[] (on the $1,000 fictitious base). */
  pnl: number;
}

export interface RoundTripStats {
  count: number;
  winRate: number;
  avgPnl: number;
  bestPnl: number;
  worstPnl: number;
}

export interface BacktestReport {
  asset: string;
  period: BacktestPeriod;
  startTimeMs: number;
  endTimeMs: number;
  startCash: number;
  bars: number;
  equity: BacktestEquityPoint[];
  metrics: BacktestResult;
  benchmarks: { buyHold: BenchmarkResult; dca: BenchmarkResult };
  roundTrips: ClosedRoundTrip[];
  roundTripStats: RoundTripStats;
  events: SignalFlipEvent[];
}

/**
 * Reconstruct closed round-trips from the target series, paired in order with
 * the engine's booked P&L. `desired[i]` (= target[i-1], the next-open shift)
 * is the position held at bar `i`; a round-trip is a maximal run of bars with
 * `desired > 0` that ENDS by returning to 0 within the series. A run still
 * open at the last bar is dropped, so the count matches `trades.length`.
 */
export const closedRoundTrips = (
  candles: Candle[],
  target: number[],
  trades: number[],
): ClosedRoundTrip[] => {
  const trips: ClosedRoundTrip[] = [];
  let entryBar: number | null = null;
  for (let i = 0; i < candles.length; i++) {
    const desired = i > 0 ? target[i - 1] : 0;
    if (desired > 0 && entryBar === null) {
      entryBar = i;
    } else if (desired === 0 && entryBar !== null) {
      trips.push({
        entryTimeMs: candles[entryBar].timeMs,
        exitTimeMs: candles[i].timeMs,
        holdingDays: Math.round(
          (candles[i].timeMs - candles[entryBar].timeMs) / DAY_MS,
        ),
        entryPrice: candles[entryBar].open,
        exitPrice: candles[i].open,
        pnl: 0, // filled from trades[] below
      });
      entryBar = null;
    }
  }
  // Pair sequentially with the engine's per-round-trip P&L (same order). If the
  // counts ever diverge, leave pnl at 0 rather than mis-attribute.
  if (trips.length === trades.length) {
    for (let k = 0; k < trips.length; k++) trips[k].pnl = trades[k];
  }
  return trips;
};

const summarize = (trades: number[]): RoundTripStats => {
  const count = trades.length;
  if (count === 0)
    return { count: 0, winRate: 0, avgPnl: 0, bestPnl: 0, worstPnl: 0 };
  const wins = trades.filter((p) => p > 0).length;
  return {
    count,
    winRate: wins / count,
    avgPnl: trades.reduce((s, p) => s + p, 0) / count,
    bestPnl: Math.max(...trades),
    worstPnl: Math.min(...trades),
  };
};

/** Build the full backtest report for one asset over the given candle window. */
export const buildBacktestReport = (
  asset: string,
  candles: Candle[],
  period: BacktestPeriod,
): BacktestReport => {
  if (candles.length === 0) {
    throw new Error(`No candles for ${asset} (${period})`);
  }
  const target = ensembleTarget(candles, { targetVol: TARGET_VOL });
  const metrics = runBacktest(candles, target, { startCash: START_CASH });
  const bh = buyAndHold(candles, { startCash: START_CASH });
  const dca = dcaBenchmark(candles, { startCash: START_CASH });

  const equity: BacktestEquityPoint[] = candles.map((c, i) => ({
    timeMs: c.timeMs,
    strategy: metrics.equity[i],
    buyHold: bh.equity[i],
    dca: dca.equity[i],
  }));

  const events = computeSignalFlips(asset, candles, {
    afterTimeMs: candles[0].timeMs - 1,
    upToIndex: candles.length - 1,
  });

  return {
    asset,
    period,
    startTimeMs: candles[0].timeMs,
    endTimeMs: candles[candles.length - 1].timeMs,
    startCash: START_CASH,
    bars: candles.length,
    equity,
    metrics,
    benchmarks: { buyHold: bh, dca },
    roundTrips: closedRoundTrips(candles, target, metrics.trades),
    roundTripStats: summarize(metrics.trades),
    events,
  };
};
