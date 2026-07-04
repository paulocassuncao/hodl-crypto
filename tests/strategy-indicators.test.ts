import { donchianPositions } from "@/lib/strategy/donchian";
import { emaTrendPositions } from "@/lib/strategy/emaTrend";
import { ema, realizedVol, sma } from "@/lib/strategy/indicators";
import { applyRisk } from "@/lib/strategy/risk";
import type { Candle } from "@/lib/strategy/types";

const DAY = 86_400_000;

const candle = (i: number, over: Partial<Candle> = {}): Candle => ({
  timeMs: i * DAY,
  open: 100,
  high: 105,
  low: 95,
  close: 100,
  volume: 1,
  ...over,
});

describe("sma", () => {
  it("is null during warm-up and the rolling mean after", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });
});

describe("ema", () => {
  it("seeds with the SMA of the first `length` values", () => {
    // length 3 → k = 0.5; seed at i=2 is mean(1,2,3) = 2.
    const out = ema([1, 2, 3, 4, 5], 3);
    expect(out.slice(0, 3)).toEqual([null, null, 2]);
    // EMA[3] = 4·0.5 + 2·0.5 = 3; EMA[4] = 5·0.5 + 3·0.5 = 4.
    expect(out[3]).toBeCloseTo(3, 12);
    expect(out[4]).toBeCloseTo(4, 12);
  });
});

describe("realizedVol", () => {
  it("is null until `window` returns exist, then population std × √365", () => {
    // closes → returns [null, 1, -0.5, 1, -0.5]; window 2.
    const out = realizedVol([1, 2, 1, 2, 1], 2);
    expect(out[0]).toBeNull();
    expect(out[1]).toBeNull(); // only one return so far
    // i=2: returns [1, -0.5] → mean 0.25, pop std = 0.75.
    expect(out[2]).toBeCloseTo(0.75 * Math.sqrt(365), 12);
  });

  it("uses the population std (÷ n), not the sample std", () => {
    const out = realizedVol([1, 2, 1, 2], 3);
    // returns [1, -0.5, 1] → mean 0.5, pop var = (0.25+1+0.25)/3 = 0.5.
    expect(out[3]).toBeCloseTo(Math.sqrt(0.5) * Math.sqrt(365), 12);
  });
});

describe("emaTrendPositions", () => {
  it("is flat during warm-up and long only when fast>slow and close>filter", () => {
    // Rising series: after warm-up all EMAs order correctly → long.
    const rising = Array.from({ length: 12 }, (_, i) =>
      candle(i, { close: 100 + i * 5 }),
    );
    const pos = emaTrendPositions(rising, { fast: 2, slow: 3, trendFilter: 5 });
    expect(pos.slice(0, 4)).toEqual([0, 0, 0, 0]); // filter warm-up
    expect(pos[11]).toBe(1);

    // Falling series: fast < slow → flat everywhere.
    const falling = Array.from({ length: 12 }, (_, i) =>
      candle(i, { close: 200 - i * 5 }),
    );
    expect(
      emaTrendPositions(falling, { fast: 2, slow: 3, trendFilter: 5 }),
    ).toEqual(new Array(12).fill(0));
  });
});

describe("donchianPositions", () => {
  it("enters on a break of the entry-high and exits on a break of the exit-low", () => {
    // entry=3, exit=2. Bars 0-2 flat at high=105/low=95.
    const candles = [
      candle(0),
      candle(1),
      candle(2),
      // i=3: close 110 > max(high[0..2]) = 105 → enter.
      candle(3, { close: 110, high: 111, low: 100 }),
      // i=4: close 108 > min(low[2..3]) = 95 → hold.
      candle(4, { close: 108, high: 112, low: 101 }),
      // i=5: close 90 < min(low[3..4]) = 100 → exit.
      candle(5, { close: 90, high: 109, low: 89 }),
      candle(6, { close: 91 }),
    ];
    const pos = donchianPositions(candles, { entry: 3, exit: 2 });
    expect(pos).toEqual([0, 0, 0, 1, 1, 0, 0]);
  });

  it("uses only bars strictly before i (no lookahead)", () => {
    // A close equal to the prior high must NOT trigger entry.
    const candles = [
      candle(0),
      candle(1),
      candle(2),
      candle(3, { close: 105 }),
    ];
    expect(donchianPositions(candles, { entry: 3, exit: 2 })[3]).toBe(0);
  });
});

describe("applyRisk", () => {
  it("zeroes flat bars and caps sizing at maxFrac before vol warm-up", () => {
    const candles = Array.from({ length: 5 }, (_, i) => candle(i));
    const out = applyRisk(candles, [0, 1, 1, 0, 1], {
      targetVol: 0.6,
      volWindow: 30, // never warms up in 5 bars → maxFrac
      maxFrac: 1,
    });
    expect(out).toEqual([0, 1, 1, 0, 1]);
  });

  it("sizes long bars by targetVol / realizedVol", () => {
    // Alternating closes make vol huge → fraction well below 1.
    const candles = [1, 2, 1, 2, 1, 2].map((close, i) => candle(i, { close }));
    const out = applyRisk(candles, new Array(6).fill(1), {
      targetVol: 0.6,
      volWindow: 2,
      maxFrac: 1,
    });
    expect(out[5]).toBeGreaterThan(0);
    expect(out[5]).toBeLessThan(0.1); // vol ≈ 0.75·√365 ≈ 14.3 → 0.6/14.3 ≈ 0.042
  });
});
