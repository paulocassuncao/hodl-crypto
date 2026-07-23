/**
 * Guards the shared-series optimisation: reusing a precomputed realized-vol
 * series (or a whole `SignalSeries`) must be indistinguishable from letting
 * each function build its own. The parity gate proves the numbers are right;
 * this proves sharing them does not change the numbers.
 */

import btcCandlesRaw from "@/tests/fixtures/binance-btcusdt-daily.json";

import { buildSignalSeries, computeSignalFlips, signalSnapshotAt } from "@/lib/strategy/attribution";
import { ENSEMBLE_VOL_WINDOW, ensembleTarget } from "@/lib/strategy/ensemble";
import { realizedVol } from "@/lib/strategy/indicators";
import { applyRisk } from "@/lib/strategy/risk";
import { emaTrendPositions } from "@/lib/strategy/emaTrend";
import { advanceSleeve, initSleeveState } from "@/lib/sleeve";
import type { Candle } from "@/lib/strategy/types";

const candles: Candle[] = (btcCandlesRaw as number[][]).map(
  ([timeMs, open, high, low, close, volume]) => ({
    timeMs,
    open,
    high,
    low,
    close,
    volume,
  }),
);
const closes = candles.map((c) => c.close);
const vol = realizedVol(closes, ENSEMBLE_VOL_WINDOW);
const nowMs = candles[candles.length - 1].timeMs + 86_400_000;

describe("applyRisk with a precomputed vol series", () => {
  it("matches the self-computed result", () => {
    const raw = emaTrendPositions(candles);
    expect(applyRisk(candles, raw, { vol })).toEqual(
      applyRisk(candles, raw),
    );
  });
});

describe("ensembleTarget with a precomputed vol series", () => {
  it("matches the self-computed result", () => {
    expect(ensembleTarget(candles, { vol })).toEqual(ensembleTarget(candles));
  });

  it("matches at a non-default targetVol too — vol does not depend on it", () => {
    expect(ensembleTarget(candles, { targetVol: 0.3, vol })).toEqual(
      ensembleTarget(candles, { targetVol: 0.3 }),
    );
  });
});

describe("buildSignalSeries", () => {
  it("produces the same ensemble the standalone call does", () => {
    expect(buildSignalSeries(candles).ensemble).toEqual(ensembleTarget(candles));
  });

  it("keeps a custom volWindow display-only, out of the ensemble", () => {
    // The documented invariant: attribution windows are for the snapshot, the
    // ensemble stays on the validated 20/50/200 + 20/10 at its own vol window.
    const custom = buildSignalSeries(candles, { volWindow: 10 });
    expect(custom.vol).toEqual(realizedVol(closes, 10));
    expect(custom.ensemble).toEqual(ensembleTarget(candles));
  });
});

describe("attribution consumers given a shared series", () => {
  const series = buildSignalSeries(candles);
  const lastIdx = candles.length - 1;

  it("signalSnapshotAt matches the unshared result", () => {
    expect(signalSnapshotAt(candles, lastIdx, {}, series)).toEqual(
      signalSnapshotAt(candles, lastIdx),
    );
  });

  it("computeSignalFlips matches the unshared result", () => {
    const window = { afterTimeMs: candles[0].timeMs - 1, upToIndex: lastIdx };
    expect(computeSignalFlips("BTC", candles, window, {}, series)).toEqual(
      computeSignalFlips("BTC", candles, window),
    );
  });
});

describe("advanceSleeve with a precomputed vol series", () => {
  it("produces identical trades, equity and state", () => {
    const state = initSleeveState("BTC", candles.slice(0, -30), nowMs);
    expect(advanceSleeve(state, candles, nowMs, { vol })).toEqual(
      advanceSleeve(state, candles, nowMs),
    );
  });
});
