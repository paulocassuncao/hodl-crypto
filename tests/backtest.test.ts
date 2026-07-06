import {
  buildBacktestReport,
  closedRoundTrips,
} from "@/lib/backtest";
import { computeSignalFlips } from "@/lib/strategy/attribution";
import { buyAndHold, dcaBenchmark, runBacktest } from "@/lib/strategy/backtest";
import { ensembleTarget } from "@/lib/strategy/ensemble";
import type { Candle } from "@/lib/strategy/types";

import btcCandlesRaw from "@/tests/fixtures/binance-btcusdt-daily.json";

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

describe("buildBacktestReport", () => {
  const report = buildBacktestReport("BTC", btc, "max");

  it("metrics match runBacktest on the ensemble target exactly", () => {
    const direct = runBacktest(btc, ensembleTarget(btc, { targetVol: 0.6 }), {
      startCash: 1000,
    });
    expect(report.metrics).toEqual(direct);
  });

  it("aligns the three equity series bar-for-bar", () => {
    const bh = buyAndHold(btc, { startCash: 1000 });
    const dca = dcaBenchmark(btc, { startCash: 1000 });
    expect(report.equity).toHaveLength(btc.length);
    expect(report.equity[0].timeMs).toBe(btc[0].timeMs);
    const last = report.equity[report.equity.length - 1];
    expect(last.strategy).toBe(report.metrics.finalEquity);
    expect(last.buyHold).toBe(bh.finalEquity);
    expect(last.dca).toBe(dca.finalEquity);
  });

  it("carries the full-history signal flips", () => {
    const events = computeSignalFlips("BTC", btc, {
      afterTimeMs: btc[0].timeMs - 1,
      upToIndex: btc.length - 1,
    });
    expect(report.events).toEqual(events);
    expect(report.events.length).toBeGreaterThan(50);
  });

  it("summarizes round-trip stats consistently with the trades", () => {
    const { trades } = report.metrics;
    expect(report.roundTripStats.count).toBe(report.metrics.nTrades);
    expect(report.roundTripStats.bestPnl).toBe(Math.max(...trades));
    expect(report.roundTripStats.worstPnl).toBe(Math.min(...trades));
    const wins = trades.filter((p) => p > 0).length;
    expect(report.roundTripStats.winRate).toBeCloseTo(wins / trades.length, 10);
  });

  it("records window bounds and base capital", () => {
    expect(report.asset).toBe("BTC");
    expect(report.period).toBe("max");
    expect(report.startTimeMs).toBe(btc[0].timeMs);
    expect(report.endTimeMs).toBe(btc[btc.length - 1].timeMs);
    expect(report.startCash).toBe(1000);
    expect(report.bars).toBe(btc.length);
  });

  it("throws on an empty candle window", () => {
    expect(() => buildBacktestReport("BTC", [], "1y")).toThrow("No candles");
  });
});

describe("closedRoundTrips", () => {
  const target = ensembleTarget(btc, { targetVol: 0.6 });
  const metrics = runBacktest(btc, target, { startCash: 1000 });
  const trips = closedRoundTrips(btc, target, metrics.trades);

  it("produces one round-trip per booked trade", () => {
    expect(trips).toHaveLength(metrics.nTrades);
  });

  it("pairs each trip's P&L with the engine's trades in order", () => {
    trips.forEach((t, k) => expect(t.pnl).toBe(metrics.trades[k]));
  });

  it("has coherent entry→exit windows at bar opens", () => {
    for (const t of trips) {
      expect(t.exitTimeMs).toBeGreaterThan(t.entryTimeMs);
      expect(t.holdingDays).toBeGreaterThan(0);
      expect(t.entryPrice).toBeGreaterThan(0);
      expect(t.exitPrice).toBeGreaterThan(0);
    }
  });

  it("drops a still-open trailing run so the count matches trades", () => {
    // A synthetic series that ends while still long: last desired > 0.
    const bar = (i: number, close: number): Candle => ({
      timeMs: i * 86_400_000,
      open: close,
      high: close,
      low: close,
      close,
      volume: 0,
    });
    const candles = [bar(0, 100), bar(1, 100), bar(2, 100)];
    // desired[2] = target[1] > 0 → open at the last bar, never closes.
    const openTail = [0, 0.5, 0.5];
    expect(closedRoundTrips(candles, openTail, [])).toEqual([]);
  });

  it("leaves pnl at 0 when trip and trade counts diverge", () => {
    const bar = (i: number, close: number): Candle => ({
      timeMs: i * 86_400_000,
      open: close,
      high: close,
      low: close,
      close,
      volume: 0,
    });
    // One closed trip (0 → 0.5 → 0), but no trades supplied.
    const candles = [bar(0, 100), bar(1, 100), bar(2, 100), bar(3, 100)];
    const t = [0, 0.5, 0, 0];
    const trips = closedRoundTrips(candles, t, []);
    expect(trips).toHaveLength(1);
    expect(trips[0].pnl).toBe(0);
  });
});
