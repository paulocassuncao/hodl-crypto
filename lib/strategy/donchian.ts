/**
 * Donchian channel breakout — Turtle System 1 (Python reference:
 * `trading/strategies/donchian.py`). Stateful with hysteresis: enter long on
 * a close above the `entry`-day high, exit on a close below the `exit`-day
 * low. Channels use bars strictly BEFORE `i` (no lookahead).
 */

import type { Candle } from "@/lib/strategy/types";

export interface DonchianParams {
  entry?: number;
  exit?: number;
}

/** Raw 0/1 target positions, one per candle. */
export const donchianPositions = (
  candles: Candle[],
  { entry = 20, exit = 10 }: DonchianParams = {},
): number[] => {
  const n = candles.length;
  const pos = new Array<number>(n).fill(0);
  let holding = false;
  for (let i = 0; i < n; i++) {
    if (i < entry) continue;
    let upper = -Infinity;
    for (let j = i - entry; j < i; j++) upper = Math.max(upper, candles[j].high);
    let lower: number | null = null;
    if (i >= exit) {
      lower = Infinity;
      for (let j = i - exit; j < i; j++) lower = Math.min(lower, candles[j].low);
    }
    if (!holding) {
      if (candles[i].close > upper) holding = true;
    } else if (lower !== null && candles[i].close < lower) {
      holding = false;
    }
    pos[i] = holding ? 1.0 : 0.0;
  }
  return pos;
};
