/**
 * Backtest / execution engine (Python reference: `trading/backtest/engine.py`).
 *
 * Fraction-of-equity, long-only, NEXT-OPEN execution: a position decided at
 * the close of bar `i` executes at the open of bar `i+1` — enforced by the
 * `desired = target[i−1]` shift, the engine's no-lookahead guarantee. Costs:
 * 0.10% fee per side + 0.05% slippage. Numeric parity with the §4 oracle
 * numbers is enforced by tests/strategy-parity.test.ts.
 */

import type {
  BacktestResult,
  Candle,
  RebalanceThreshold,
  TradePnl,
} from "@/lib/strategy/types";

export const FEE = 0.001;
export const SLIPPAGE = 0.0005;

/** Position residue below which a position counts as fully closed. */
const DUST = 1e-9;

const MS_PER_YEAR = 365 * 86_400_000;

/** Bars per year inferred from the spacing of the first two candles. */
export const barsPerYear = (candles: Candle[]): number => {
  const dtMs = candles[1].timeMs - candles[0].timeMs;
  return MS_PER_YEAR / dtMs;
};

const maxDrawdown = (equity: number[]): number => {
  let peak = equity[0];
  let mdd = 0;
  for (const v of equity) {
    peak = Math.max(peak, v);
    mdd = Math.min(mdd, v / peak - 1);
  }
  return mdd;
};

/** Annualized Sharpe of the equity curve's simple returns (population std). */
const sharpe = (equity: number[], bpy: number): number => {
  const rets: number[] = [];
  for (let i = 1; i < equity.length; i++)
    rets.push(equity[i] / equity[i - 1] - 1);
  if (rets.length === 0) return 0;
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const variance =
    rets.reduce((s, r) => s + (r - mean) * (r - mean), 0) / rets.length;
  const sd = Math.sqrt(variance);
  return sd > 0 ? (mean / sd) * Math.sqrt(bpy) : 0;
};

export interface BacktestOptions {
  startCash?: number;
  fee?: number;
  slippage?: number;
  /** See {@link RebalanceThreshold} — the oracle backtest uses absolute 1e-9. */
  threshold?: RebalanceThreshold;
}

const shouldRebalance = (
  delta: number,
  eqOpen: number,
  threshold: RebalanceThreshold,
): boolean =>
  threshold.kind === "absolute"
    ? Math.abs(delta) > threshold.value
    : Math.abs(delta) > eqOpen * threshold.value;

/**
 * Run the strategy: `target[i]` was decided at the close of bar `i`, so it
 * executes at the open of bar `i+1`. Trades are counted as closed round-trips
 * (entry value recorded on the first buy of a position; P&L booked on the
 * sell that empties it).
 */
export const runBacktest = (
  candles: Candle[],
  target: number[],
  {
    startCash = 1000,
    fee = FEE,
    slippage = SLIPPAGE,
    threshold = { kind: "absolute", value: 1e-9 },
  }: BacktestOptions = {},
): BacktestResult => {
  let cash = startCash;
  let units = 0;
  const equity: number[] = [];
  const trades: TradePnl[] = [];
  let entryValue: number | null = null;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const desired = i > 0 ? target[i - 1] : 0;
    const eqOpen = cash + units * c.open;
    const delta = desired * eqOpen - units * c.open;

    if (shouldRebalance(delta, eqOpen, threshold) && eqOpen > 0) {
      if (delta > 0) {
        const px = c.open * (1 + slippage);
        const spend = Math.min(delta, cash);
        const bought = spend / px;
        cash -= spend;
        cash -= spend * fee;
        units += bought;
        if (entryValue === null) entryValue = spend;
      } else {
        const px = c.open * (1 - slippage);
        const sold = Math.min(-delta / px, units);
        const proceeds = sold * px;
        cash += proceeds;
        cash -= proceeds * fee;
        units -= sold;
        if (units <= DUST && entryValue !== null) {
          trades.push(proceeds - entryValue);
          entryValue = null;
        }
      }
    }

    equity.push(cash + units * c.close);
  }

  const bpy = barsPerYear(candles);
  const finalEquity = equity[equity.length - 1];
  return {
    equity,
    trades,
    nTrades: trades.length,
    finalEquity,
    totalReturn: finalEquity / startCash - 1,
    maxDrawdown: maxDrawdown(equity),
    sharpe: sharpe(equity, bpy),
  };
};

export interface BenchmarkResult {
  equity: number[];
  finalEquity: number;
  totalReturn: number;
  maxDrawdown: number;
}

/** Buy everything at the first bar's open (with costs), hold forever. */
export const buyAndHold = (
  candles: Candle[],
  { startCash = 1000, fee = FEE, slippage = SLIPPAGE }: BacktestOptions = {},
): BenchmarkResult => {
  const px = candles[0].open * (1 + slippage);
  const units = (startCash * (1 - fee)) / px;
  const equity = candles.map((c) => units * c.close);
  const finalEquity = equity[equity.length - 1];
  return {
    equity,
    finalEquity,
    totalReturn: finalEquity / startCash - 1,
    maxDrawdown: maxDrawdown(equity),
  };
};

/**
 * DCA benchmark: split the capital into equal tranches invested every
 * `periodBars` (default ≈ weekly) from start to end; never sell. Cash not yet
 * deployed counts toward equity.
 */
export const dcaBenchmark = (
  candles: Candle[],
  {
    startCash = 1000,
    fee = FEE,
    slippage = SLIPPAGE,
    periodBars,
  }: BacktestOptions & { periodBars?: number } = {},
): BenchmarkResult => {
  const period = periodBars ?? Math.max(1, Math.round(barsPerYear(candles) / 52));
  const buyIdx = new Set<number>();
  for (let i = 0; i < candles.length; i += period) buyIdx.add(i);
  const tranche = startCash / buyIdx.size;

  let units = 0;
  let invested = 0;
  const equity: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (buyIdx.has(i)) {
      const px = candles[i].open * (1 + slippage);
      units += (tranche * (1 - fee)) / px;
      invested += tranche;
    }
    equity.push(units * candles[i].close + (startCash - invested));
  }
  const finalEquity = equity[equity.length - 1];
  return {
    equity,
    finalEquity,
    totalReturn: finalEquity / startCash - 1,
    maxDrawdown: maxDrawdown(equity),
  };
};
