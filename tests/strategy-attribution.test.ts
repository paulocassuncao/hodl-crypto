import {
  computeSignalFlips,
  donchianChannels,
  signalSnapshotAt,
  type AttributionParams,
} from "@/lib/strategy/attribution";
import { donchianPositions } from "@/lib/strategy/donchian";
import { emaTrendPositions } from "@/lib/strategy/emaTrend";
import { ensembleTarget } from "@/lib/strategy/ensemble";
import { ema, realizedVol } from "@/lib/strategy/indicators";
import { applyRisk } from "@/lib/strategy/risk";
import type { Candle } from "@/lib/strategy/types";

import btcCandlesRaw from "@/tests/fixtures/binance-btcusdt-daily.json";

const DAY = 86_400_000;

const toCandles = (rows: number[][]): Candle[] =>
  rows.map(([timeMs, open, high, low, close, volume]) => ({
    timeMs,
    open,
    high,
    low,
    close,
    volume,
  }));

const btc = toCandles(btcCandlesRaw as number[][]);

/** Synthetic bar: ±1 high/low around the close, open = close. */
const bar = (i: number, close: number): Candle => ({
  timeMs: i * DAY,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 0,
});

/** Short-warm-up params so synthetic series stay tiny. */
const FAST_PARAMS: AttributionParams = {
  fast: 2,
  slow: 3,
  trendFilter: 5,
  entry: 3,
  exit: 2,
  volWindow: 3,
};

/**
 * Flat 100s, a breakout to 130 at bar 6 (EMA on + Donchian entry), flat, then
 * a crash to 90 at bar 10 (EMA off + Donchian exit).
 */
const synthetic: Candle[] = [
  ...[0, 1, 2, 3, 4, 5].map((i) => bar(i, 100)),
  bar(6, 130),
  bar(7, 130),
  bar(8, 130),
  bar(9, 130),
  bar(10, 90),
  bar(11, 90),
];

describe("donchianChannels", () => {
  it("re-derives the exact windows donchianPositions uses, null in warm-up", () => {
    const { upper, lower } = donchianChannels(synthetic, FAST_PARAMS);
    expect(upper[2]).toBeNull(); // i < entry
    expect(lower[1]).toBeNull(); // i < exit
    // upper[6] = max high of bars 3..5 (all 101); lower[6] = min low of 4..5.
    expect(upper[6]).toBe(101);
    expect(lower[6]).toBe(99);
    // After the breakout bar enters the window:
    expect(upper[8]).toBe(131);
    expect(lower[10]).toBe(129);
  });
});

describe("computeSignalFlips (synthetic)", () => {
  const flips = computeSignalFlips(
    "BTC",
    synthetic,
    { afterTimeMs: -1, upToIndex: synthetic.length - 1 },
    FAST_PARAMS,
  );

  it("emits both strategies' entries at the breakout bar with reasons", () => {
    const at6 = flips.filter((f) => f.timeMs === 6 * DAY);
    const emaOn = at6.find((f) => f.strategy === "ema_trend");
    const donOn = at6.find((f) => f.strategy === "donchian");
    expect(emaOn).toMatchObject({ signalBefore: 0, signalAfter: 1 });
    expect(emaOn?.reason).toContain("EMA trend on");
    expect(emaOn?.reason).toContain("crossed above EMA3");
    expect(donOn).toMatchObject({ signalBefore: 0, signalAfter: 1 });
    expect(donOn?.reason).toContain("Donchian breakout");
    expect(donOn?.reason).toContain("above the 3-day high 101");
  });

  it("emits both strategies' exits at the crash bar with reasons", () => {
    const at10 = flips.filter((f) => f.timeMs === 10 * DAY);
    const emaOff = at10.find((f) => f.strategy === "ema_trend");
    const donOff = at10.find((f) => f.strategy === "donchian");
    expect(emaOff).toMatchObject({ signalBefore: 1, signalAfter: 0 });
    expect(emaOff?.reason).toContain("EMA trend off");
    expect(donOff).toMatchObject({ signalBefore: 1, signalAfter: 0 });
    expect(donOff?.reason).toContain("Donchian exit");
    expect(donOff?.reason).toContain("below the 2-day low 129");
  });

  it("carries the indicator context that explains the flip", () => {
    const donOn = flips.find(
      (f) => f.strategy === "donchian" && f.timeMs === 6 * DAY,
    );
    const closes = synthetic.map((c) => c.close);
    expect(donOn?.context.close).toBe(130);
    expect(donOn?.context.donchian_upper).toBe(101);
    expect(donOn?.context.ema_fast).toBe(ema(closes, 2)[6]);
    expect(donOn?.context.realized_vol).toBe(realizedVol(closes, 3)[6]);
    const ens = ensembleTarget(synthetic, {});
    expect(donOn?.context.ensemble_before).toBe(ens[5]);
    expect(donOn?.context.ensemble_after).toBe(ens[6]);
  });

  it("suppresses warm-up transitions", () => {
    // The very first non-zero raw bar after warm-up is not a reportable flip.
    for (const f of flips) {
      expect(f.timeMs).toBeGreaterThanOrEqual(6 * DAY);
    }
  });

  it("windows by afterTimeMs and stays idempotent across overlaps", () => {
    const fromBar8 = computeSignalFlips(
      "BTC",
      synthetic,
      { afterTimeMs: 8 * DAY, upToIndex: synthetic.length - 1 },
      FAST_PARAMS,
    );
    expect(fromBar8.every((f) => f.timeMs > 8 * DAY)).toBe(true);
    // Overlapping window emits identical events for shared bars.
    const shared = flips.filter((f) => f.timeMs > 8 * DAY);
    expect(fromBar8).toEqual(shared);
  });

  it("vol-only target changes produce no events", () => {
    // Strictly rising closes with uneven steps large enough that realized
    // vol exceeds the target: raw signals never flip after warm-up, yet the
    // vol-sized exposure keeps changing.
    const rising = [100, 110, 140, 145, 190, 200, 260, 265, 350, 360].map(
      (close, i) => bar(i, close),
    );
    const events = computeSignalFlips(
      "BTC",
      rising,
      { afterTimeMs: -1, upToIndex: rising.length - 1 },
      FAST_PARAMS,
    );
    expect(events).toEqual([]);
    // The raw signal is constant while the vol-sized exposure keeps moving.
    const raw = donchianPositions(rising, { entry: 3, exit: 2 });
    expect(raw[7]).toBe(raw[8]);
    const sized = applyRisk(rising, raw, { targetVol: 0.6, volWindow: 3 });
    expect(sized[7]).not.toBe(sized[8]);
  });
});

describe("computeSignalFlips (fixture consistency)", () => {
  it("flips exactly where the parity-locked raw arrays flip, post warm-up", () => {
    const flips = computeSignalFlips("BTC", btc, {
      afterTimeMs: -1,
      upToIndex: btc.length - 1,
    });
    const emaRaw = emaTrendPositions(btc);
    const donRaw = donchianPositions(btc);
    const closes = btc.map((c) => c.close);
    const filter = ema(closes, 200);

    const expected: { timeMs: number; strategy: string }[] = [];
    for (let i = 1; i < btc.length; i++) {
      if (filter[i - 1] !== null && emaRaw[i] !== emaRaw[i - 1])
        expected.push({ timeMs: btc[i].timeMs, strategy: "ema_trend" });
      if (i - 1 >= 20 && donRaw[i] !== donRaw[i - 1])
        expected.push({ timeMs: btc[i].timeMs, strategy: "donchian" });
    }
    expect(flips.map((f) => ({ timeMs: f.timeMs, strategy: f.strategy }))).toEqual(
      expect.arrayContaining(expected),
    );
    expect(flips).toHaveLength(expected.length);
    // Sanity: a decade of BTC daily bars flips many times.
    expect(flips.length).toBeGreaterThan(50);
  });
});

describe("signalSnapshotAt", () => {
  it("matches the underlying parity-locked series at the last bar", () => {
    const i = btc.length - 1;
    const snap = signalSnapshotAt(btc, i);
    const closes = btc.map((c) => c.close);
    expect(snap.time_ms).toBe(btc[i].timeMs);
    expect(snap.close).toBe(btc[i].close);
    expect(snap.ema_fast).toBe(ema(closes, 20)[i]);
    expect(snap.ema_slow).toBe(ema(closes, 50)[i]);
    expect(snap.ema_filter).toBe(ema(closes, 200)[i]);
    expect(snap.ema_signal).toBe(emaTrendPositions(btc)[i]);
    expect(snap.donchian_signal).toBe(donchianPositions(btc)[i]);
    const { upper, lower } = donchianChannels(btc);
    expect(snap.donchian_upper).toBe(upper[i]);
    expect(snap.donchian_lower).toBe(lower[i]);
    const vol = realizedVol(closes, 30)[i];
    expect(snap.realized_vol).toBe(vol);
    expect(snap.sizing_frac).toBe(Math.min(1, 0.6 / (vol as number)));
    expect(snap.ensemble_target).toBe(ensembleTarget(btc, {})[i]);
  });

  it("reports nulls during warm-up instead of fake numbers", () => {
    const snap = signalSnapshotAt(btc, 10);
    expect(snap.ema_filter).toBeNull();
    expect(snap.realized_vol).toBeNull();
    expect(snap.sizing_frac).toBeNull();
  });

  it("rejects an out-of-range index", () => {
    expect(() => signalSnapshotAt(btc, btc.length)).toThrow("out of range");
  });
});
