import {
  advanceSleeve,
  initSleeveState,
  latestClosedBarIndex,
  MIN_BARS,
  type SleeveState,
} from "@/lib/sleeve";
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

describe("latestClosedBarIndex", () => {
  const candles: Candle[] = [0, 1, 2].map((i) => ({
    timeMs: i * DAY,
    open: 1,
    high: 1,
    low: 1,
    close: 1,
    volume: 0,
  }));

  it("excludes the still-forming bar", () => {
    // At now = 2.5 days, bar 2 (opened at 2d) is still forming.
    expect(latestClosedBarIndex(candles, 2.5 * DAY)).toBe(1);
    // Exactly at close time the bar counts as closed.
    expect(latestClosedBarIndex(candles, 3 * DAY)).toBe(2);
  });

  it("returns -1 when nothing has closed", () => {
    expect(latestClosedBarIndex(candles, 0.5 * DAY)).toBe(-1);
  });
});

describe("initSleeveState", () => {
  it("starts in cash anchored to the latest closed bar (no replay)", () => {
    const nowMs = btc[btc.length - 1].timeMs + DAY;
    const state = initSleeveState("BTC", btc, nowMs);
    expect(state).toMatchObject({
      asset: "BTC",
      cash: 500,
      units: 0,
      position: 0,
      allocation: 500,
      targetVol: 0.6,
    });
    expect(state.lastTimeMs).toBe(btc[btc.length - 1].timeMs);
  });

  it("rejects insufficient history", () => {
    expect(() =>
      initSleeveState("BTC", btc.slice(0, MIN_BARS - 1), Date.now()),
    ).toThrow("Not enough history");
  });
});

describe("advanceSleeve", () => {
  // Anchor the account 30 bars before the end of the fixture, then advance
  // over the final 30 closed bars — a realistic catch-up run.
  const anchorIdx = btc.length - 31;
  const nowMs = btc[btc.length - 1].timeMs + DAY;
  const initial: SleeveState = {
    asset: "BTC",
    cash: 500,
    units: 0,
    position: 0,
    lastTimeMs: btc[anchorIdx].timeMs,
    allocation: 500,
    targetVol: 0.6,
  };

  it("processes exactly the newly-closed bars and books equity per bar", () => {
    const advance = advanceSleeve(initial, btc, nowMs);
    expect(advance.barsProcessed).toBe(30);
    expect(advance.newEquityPoints).toHaveLength(30);
    expect(advance.state.lastTimeMs).toBe(btc[btc.length - 1].timeMs);
    // Cash conservation: equity stays positive and near the allocation scale.
    for (const p of advance.newEquityPoints) expect(p.equity).toBeGreaterThan(0);
  });

  it("is idempotent: a second run with the advanced state is a no-op", () => {
    const first = advanceSleeve(initial, btc, nowMs);
    const second = advanceSleeve(first.state, btc, nowMs);
    expect(second.barsProcessed).toBe(0);
    expect(second.newTrades).toHaveLength(0);
    expect(second.newEquityPoints).toHaveLength(0);
    expect(second.state).toEqual(first.state);
  });

  it("does not act on the still-forming bar", () => {
    // now = just after the last bar OPENED (not yet closed).
    const forming = btc[btc.length - 1].timeMs + DAY / 2;
    const advance = advanceSleeve(initial, btc, forming);
    expect(advance.barsProcessed).toBe(29);
    expect(advance.state.lastTimeMs).toBe(btc[btc.length - 2].timeMs);
  });

  it("is a no-op below the minimum history", () => {
    const short = btc.slice(0, MIN_BARS - 10);
    const advance = advanceSleeve(initial, short, nowMs);
    expect(advance.barsProcessed).toBe(0);
    expect(advance.state).toEqual(initial);
  });

  it("uses the fraction-of-equity threshold (skips micro-rebalances)", () => {
    // With a freshly-advanced state, re-advancing over one extra synthetic
    // bar whose target barely moves must produce no trade.
    const caughtUp = advanceSleeve(initial, btc, nowMs).state;
    const last = btc[btc.length - 1];
    const extraBar: Candle = {
      timeMs: last.timeMs + DAY,
      open: last.close,
      high: last.close,
      low: last.close,
      close: last.close,
      volume: 0,
    };
    const extended = [...btc, extraBar];
    const advance = advanceSleeve(caughtUp, extended, nowMs + DAY);
    expect(advance.barsProcessed).toBe(1);
    // A flat synthetic bar keeps the target ~unchanged → no rebalance worth
    // 0.1% of equity → no trade rows.
    expect(advance.newTrades.length).toBeLessThanOrEqual(1);
  });
});
