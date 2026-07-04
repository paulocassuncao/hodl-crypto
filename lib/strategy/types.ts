/**
 * Shared types for the trading-strategy engine (`lib/strategy/*`) — the
 * TypeScript port of the validated Python reference (HODL-HANDOVER.md §3).
 * All series are daily OHLCV, oldest → newest; positions are long-only in
 * [0, 1] where 1 = fully invested and fractions are partial exposure.
 */

/** One OHLCV bar. `timeMs` is the bar's open time (epoch ms). */
export interface Candle {
  timeMs: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * When a rebalance is worth executing. The Python backtest oracle uses an
 * absolute `|delta| > 1e-9` (the §4 numbers depend on it); the paper-trading
 * loop uses `|delta| > 0.001 × equity`. Parameterized so both are explicit —
 * do not "simplify" one into the other (see tests/strategy-parity.test.ts).
 */
export interface RebalanceThreshold {
  kind: "absolute" | "fraction_of_equity";
  value: number;
}

/** One closed round-trip's P&L in USD (sell proceeds − entry value). */
export type TradePnl = number;

export interface BacktestResult {
  /** Mark-to-market equity at each bar's close. */
  equity: number[];
  /** P&L of each closed round-trip. */
  trades: TradePnl[];
  /** Number of closed round-trips. */
  nTrades: number;
  finalEquity: number;
  /** `finalEquity / startCash − 1`. */
  totalReturn: number;
  /** Most negative `equity / runningPeak − 1` (≤ 0). */
  maxDrawdown: number;
  /** Mean/population-std of daily equity returns, annualized by √barsPerYear. */
  sharpe: number;
}
