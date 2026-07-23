/**
 * Pure paper-trading core for the sleeve (Python reference:
 * `trading/execution/paper.py`) — no I/O so it can be unit-tested directly.
 * The `/api/sleeve/run` route persists the results to Supabase.
 *
 * Model: per asset, a fictitious account starts TODAY, in cash (no historical
 * replay). Each run recomputes the ensemble target over the full candle
 * series and, for every newly-closed daily bar since `lastTimeMs`, applies
 * the §3.6 execution at that bar's open — position decided at the close of
 * bar j−1 executes at the open of bar j. Rebalances use the paper-loop
 * threshold (0.1% of equity), NOT the backtest oracle's absolute 1e-9.
 * Idempotency falls out of `lastTimeMs` monotonicity.
 */

import { FEE, SLIPPAGE } from "@/lib/strategy/backtest";
import { ensembleTarget } from "@/lib/strategy/ensemble";
import type { Candle } from "@/lib/strategy/types";

const DAY_MS = 86_400_000;
/** Paper-loop rebalance threshold: fraction of equity (paper.py). */
const REBALANCE_FRAC = 0.001;
/** Minimum history for the ensemble's 200-bar warm-up plus margin. */
export const MIN_BARS = 250;

export interface SleeveState {
  asset: string;
  cash: number;
  units: number;
  /** Target exposure currently held, in [0, 1]. */
  position: number;
  /** Open time (epoch ms) of the last processed daily bar. */
  lastTimeMs: number;
  /** Fictitious starting capital for this asset. */
  allocation: number;
  targetVol: number;
}

export interface SleeveTrade {
  asset: string;
  timeMs: number;
  side: "buy" | "sell";
  price: number;
  units: number;
  positionAfter: number;
  equityAfter: number;
}

export interface SleeveEquityPoint {
  asset: string;
  timeMs: number;
  equity: number;
}

export interface SleeveAdvance {
  state: SleeveState;
  newTrades: SleeveTrade[];
  newEquityPoints: SleeveEquityPoint[];
  barsProcessed: number;
}

/**
 * Index of the latest CLOSED daily bar at `nowMs` (a bar opened at `t` is
 * closed iff `t + 1 day ≤ now`), or −1 when none. Excludes the still-forming
 * bar so a run never acts on partial data.
 */
export const latestClosedBarIndex = (
  candles: Candle[],
  nowMs: number,
): number => {
  for (let i = candles.length - 1; i >= 0; i--) {
    if (candles[i].timeMs + DAY_MS <= nowMs) return i;
  }
  return -1;
};

/**
 * Fresh per-asset state: all cash, anchored to the latest closed bar so the
 * simulation starts deploying from the NEXT bar (init semantics of paper.py:
 * "starts from today, in cash").
 */
export const initSleeveState = (
  asset: string,
  candles: Candle[],
  nowMs: number,
  { allocation = 500, targetVol = 0.6 } = {},
): SleeveState => {
  const last = latestClosedBarIndex(candles, nowMs);
  if (last + 1 < MIN_BARS) {
    throw new Error(
      `Not enough history for ${asset}: ${last + 1} closed bars (< ${MIN_BARS})`,
    );
  }
  return {
    asset,
    cash: allocation,
    units: 0,
    position: 0,
    lastTimeMs: candles[last].timeMs,
    allocation,
    targetVol,
  };
};

/**
 * Advance the paper account over every newly-closed bar after
 * `state.lastTimeMs`. Pure: returns the next state plus the trades/equity
 * points to append. Running it twice with the same inputs is a no-op the
 * second time.
 */
export const advanceSleeve = (
  state: SleeveState,
  candles: Candle[],
  nowMs: number,
  /**
   * Realized vol for these candles, when the caller already has it. It depends
   * only on the closes and the fixed window — not on `targetVol` — so sharing
   * it is safe whatever risk dial this account is on.
   */
  { vol }: { vol?: (number | null)[] } = {},
): SleeveAdvance => {
  const lastClosed = latestClosedBarIndex(candles, nowMs);
  if (lastClosed + 1 < MIN_BARS) {
    return {
      state,
      newTrades: [],
      newEquityPoints: [],
      barsProcessed: 0,
    };
  }

  const target = ensembleTarget(candles, { targetVol: state.targetVol, vol });
  let { cash, units, position } = state;
  let lastTimeMs = state.lastTimeMs;
  const newTrades: SleeveTrade[] = [];
  const newEquityPoints: SleeveEquityPoint[] = [];
  let barsProcessed = 0;

  for (let j = 0; j <= lastClosed; j++) {
    if (candles[j].timeMs <= lastTimeMs) continue;
    const c = candles[j];
    // Position decided at the close of bar j−1 executes at this bar's open.
    const desired = j > 0 ? target[j - 1] : 0;
    const eqOpen = cash + units * c.open;
    const delta = desired * eqOpen - units * c.open;

    if (Math.abs(delta) > eqOpen * REBALANCE_FRAC && eqOpen > 0) {
      if (delta > 0) {
        const px = c.open * (1 + SLIPPAGE);
        const spend = Math.min(delta, cash);
        const bought = spend / px;
        cash -= spend + spend * FEE;
        units += bought;
        newTrades.push({
          asset: state.asset,
          timeMs: c.timeMs,
          side: "buy",
          price: px,
          units: bought,
          positionAfter: desired,
          equityAfter: cash + units * c.close,
        });
      } else {
        const px = c.open * (1 - SLIPPAGE);
        const sold = Math.min(-delta / px, units);
        const proceeds = sold * px;
        cash += proceeds - proceeds * FEE;
        units -= sold;
        newTrades.push({
          asset: state.asset,
          timeMs: c.timeMs,
          side: "sell",
          price: px,
          units: sold,
          positionAfter: desired,
          equityAfter: cash + units * c.close,
        });
      }
    }

    position = desired;
    lastTimeMs = c.timeMs;
    barsProcessed++;
    newEquityPoints.push({
      asset: state.asset,
      timeMs: c.timeMs,
      equity: cash + units * c.close,
    });
  }

  return {
    state: { ...state, cash, units, position, lastTimeMs },
    newTrades,
    newEquityPoints,
    barsProcessed,
  };
};
