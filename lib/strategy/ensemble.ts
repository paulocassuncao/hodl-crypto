/**
 * The deployed sleeve strategy (Python reference: `trading/execution/paper.py`
 * `_signal`): equal-weight average of the two risk-sized exposures. E.g. ema
 * long at 0.7x + donchian flat → the account holds 0.35x. `tsmom` was tested
 * and dropped (HODL-HANDOVER.md §4.3).
 */

import { donchianPositions } from "@/lib/strategy/donchian";
import { emaTrendPositions } from "@/lib/strategy/emaTrend";
import { realizedVol } from "@/lib/strategy/indicators";
import { applyRisk } from "@/lib/strategy/risk";
import type { Candle } from "@/lib/strategy/types";

/**
 * Vol window the ensemble sizes on (`applyRisk`'s default). Fixed at the
 * validated value — exported so callers can tell whether a realized-vol series
 * they already hold is the same one, and only share it when it is.
 */
export const ENSEMBLE_VOL_WINDOW = 30;

export interface EnsembleParams {
  targetVol?: number;
  /** Precomputed realized vol for these candles (see {@link applyRisk}). */
  vol?: (number | null)[];
}

/** Sized target exposure per bar for the ema_trend + donchian ensemble. */
export const ensembleTarget = (
  candles: Candle[],
  { targetVol = 0.6, vol }: EnsembleParams = {},
): number[] => {
  // Both legs size on the same realized-vol series over the same closes;
  // computing it once here instead of once per `applyRisk` call halves the
  // O(n·window) work, and callers that already hold it pay nothing.
  const rv =
    vol ??
    realizedVol(
      candles.map((c) => c.close),
      ENSEMBLE_VOL_WINDOW,
    );
  const sizedEma = applyRisk(candles, emaTrendPositions(candles), {
    targetVol,
    vol: rv,
  });
  const sizedDon = applyRisk(candles, donchianPositions(candles), {
    targetVol,
    vol: rv,
  });
  return sizedEma.map((v, i) => (v + sizedDon[i]) / 2);
};
