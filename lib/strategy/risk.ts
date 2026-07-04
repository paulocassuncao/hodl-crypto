/**
 * Volatility-targeting risk engine (Python reference:
 * `trading/execution/risk.py`). Scales a raw 0/1 signal into a sized exposure
 * in [0, maxFrac]: `frac = min(maxFrac, targetVol / realizedVol)`, equalizing
 * risk between calmer and higher-beta assets.
 *
 * The reference also supports a hard ATR stop-loss, which the validation
 * found redundant (the regime exit fires first) and ships OFF; with the stop
 * off its entry/stopped bookkeeping never changes the output, so it is not
 * ported. `targetVol` is the single risk dial (sleeve default 0.6).
 */

import { realizedVol } from "@/lib/strategy/indicators";
import type { Candle } from "@/lib/strategy/types";

export interface RiskParams {
  targetVol?: number;
  volWindow?: number;
  maxFrac?: number;
}

/** Sized exposures aligned to `raw`; 0 wherever the raw signal is flat. */
export const applyRisk = (
  candles: Candle[],
  raw: number[],
  { targetVol = 0.6, volWindow = 30, maxFrac = 1.0 }: RiskParams = {},
): number[] => {
  const rv = realizedVol(
    candles.map((c) => c.close),
    volWindow,
  );
  const out = new Array<number>(candles.length).fill(0);
  for (let i = 0; i < candles.length; i++) {
    if (raw[i] <= 0) continue;
    const vol = rv[i];
    const frac =
      vol !== null && vol > 0 ? Math.min(maxFrac, targetVol / vol) : maxFrac;
    out[i] = raw[i] * frac;
  }
  return out;
};
