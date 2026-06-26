/**
 * Pure dollar-cost-averaging backtest over a historical price series.
 *
 * Given a `ChartPoint[]` (epoch-ms time + price, as returned by `/market_chart`),
 * simulate investing a fixed USD amount every `freqDays` from the first point to
 * the last, and compare the result against investing the same total as a single
 * lump sum at the start. No React/I/O so it can be unit-tested directly.
 */

import type { ChartPoint } from "@/lib/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface DcaResult {
  /** Number of periodic buys executed. */
  buys: number;
  /** Total USD invested (buys × amountPerBuy). */
  invested: number;
  /** Total units accumulated. */
  units: number;
  /** Average cost per unit across all buys. */
  avgCost: number;
  /** Value of accumulated units at the final price. */
  finalValue: number;
  /** Final price used for valuation. */
  finalPrice: number;
  /** Profit/loss in USD (finalValue − invested). */
  pnl: number;
  /** Return on investment as a percentage. */
  roiPct: number;
  /** Value if the whole `invested` amount were spent at the first price. */
  lumpSumValue: number;
  /** Lump-sum ROI percentage, for comparison. */
  lumpSumRoiPct: number;
}

/** Price at or just before `time` (series assumed ascending by time). */
const priceAt = (series: ChartPoint[], time: number): number => {
  let price = series[0].price;
  for (const point of series) {
    if (point.time > time) break;
    price = point.price;
  }
  return price;
};

/**
 * Run a DCA backtest. Buys occur at the start and then every `freqDays` until
 * the series ends. Returns null for an empty series or non-positive inputs.
 */
export const simulateDca = (
  series: ChartPoint[],
  amountPerBuy: number,
  freqDays: number,
): DcaResult | null => {
  if (series.length === 0 || amountPerBuy <= 0 || freqDays <= 0) return null;

  const start = series[0].time;
  const end = series[series.length - 1].time;
  const finalPrice = series[series.length - 1].price;
  const step = freqDays * MS_PER_DAY;

  let buys = 0;
  let units = 0;
  for (let t = start; t <= end; t += step) {
    const price = priceAt(series, t);
    if (price > 0) {
      units += amountPerBuy / price;
      buys += 1;
    }
  }

  const invested = buys * amountPerBuy;
  const finalValue = units * finalPrice;
  const firstPrice = series[0].price;
  const lumpSumUnits = firstPrice > 0 ? invested / firstPrice : 0;
  const lumpSumValue = lumpSumUnits * finalPrice;

  return {
    buys,
    invested,
    units,
    avgCost: units > 0 ? invested / units : 0,
    finalValue,
    finalPrice,
    pnl: finalValue - invested,
    roiPct: invested > 0 ? ((finalValue - invested) / invested) * 100 : 0,
    lumpSumValue,
    lumpSumRoiPct: invested > 0 ? ((lumpSumValue - invested) / invested) * 100 : 0,
  };
};
