/**
 * `ema_trend` strategy (Python reference: `trading/strategies/ema_trend.py`).
 * Long (1.0) when the fast EMA is above the slow EMA AND price is above the
 * long trend filter; flat (0.0) otherwise, including during indicator warm-up.
 * Validated params are fixed at 20/50/200 — the walk-forward study showed
 * re-optimization is a coin flip, so do not auto-tune (HODL-HANDOVER.md §4.4).
 */

import { ema } from "@/lib/strategy/indicators";
import type { Candle } from "@/lib/strategy/types";

export interface EmaTrendParams {
  fast?: number;
  slow?: number;
  trendFilter?: number;
}

/** Raw 0/1 target positions, one per candle. */
export const emaTrendPositions = (
  candles: Candle[],
  { fast = 20, slow = 50, trendFilter = 200 }: EmaTrendParams = {},
): number[] => {
  const closes = candles.map((c) => c.close);
  const ef = ema(closes, fast);
  const es = ema(closes, slow);
  const tf = ema(closes, trendFilter);
  const pos = new Array<number>(candles.length).fill(0);
  for (let i = 0; i < candles.length; i++) {
    const f = ef[i];
    const s = es[i];
    const t = tf[i];
    if (f === null || s === null || t === null) continue;
    pos[i] = f > s && closes[i] > t ? 1.0 : 0.0;
  }
  return pos;
};
