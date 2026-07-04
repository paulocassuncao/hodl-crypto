/**
 * The deployed sleeve strategy (Python reference: `trading/execution/paper.py`
 * `_signal`): equal-weight average of the two risk-sized exposures. E.g. ema
 * long at 0.7x + donchian flat → the account holds 0.35x. `tsmom` was tested
 * and dropped (HODL-HANDOVER.md §4.3).
 */

import { donchianPositions } from "@/lib/strategy/donchian";
import { emaTrendPositions } from "@/lib/strategy/emaTrend";
import { applyRisk } from "@/lib/strategy/risk";
import type { Candle } from "@/lib/strategy/types";

export interface EnsembleParams {
  targetVol?: number;
}

/** Sized target exposure per bar for the ema_trend + donchian ensemble. */
export const ensembleTarget = (
  candles: Candle[],
  { targetVol = 0.6 }: EnsembleParams = {},
): number[] => {
  const sizedEma = applyRisk(candles, emaTrendPositions(candles), {
    targetVol,
  });
  const sizedDon = applyRisk(candles, donchianPositions(candles), {
    targetVol,
  });
  return sizedEma.map((v, i) => (v + sizedDon[i]) / 2);
};
