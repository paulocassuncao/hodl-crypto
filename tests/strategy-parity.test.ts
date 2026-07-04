/**
 * THE PARITY GATE (HODL-HANDOVER.md §8) — proves the TypeScript port of
 * lib/strategy/* is numerically faithful to the validated Python reference.
 *
 * Fixtures were exported straight from the reference repo's market.db and
 * strategy code (trading/runners/export_parity.py): the exact candle series
 * behind the §4 numbers plus the oracle's position arrays and backtest
 * metrics. If any assertion here fails, FIX THE PORT — never loosen a
 * tolerance or regenerate a fixture to make it pass.
 */

import btcCandlesRaw from "@/tests/fixtures/binance-btcusdt-daily.json";
import ethCandlesRaw from "@/tests/fixtures/binance-ethusdt-daily.json";
import btcOracle from "@/tests/fixtures/oracle-btcusdt.json";
import ethOracle from "@/tests/fixtures/oracle-ethusdt.json";

import { runBacktest } from "@/lib/strategy/backtest";
import { donchianPositions } from "@/lib/strategy/donchian";
import { emaTrendPositions } from "@/lib/strategy/emaTrend";
import { ensembleTarget } from "@/lib/strategy/ensemble";
import { applyRisk } from "@/lib/strategy/risk";
import type { Candle } from "@/lib/strategy/types";

interface OracleMetrics {
  finalEquity: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpe: number;
  nTrades: number;
}

type StrategyKey =
  | "emaTrendRaw"
  | "donchianRaw"
  | "emaTrendSized"
  | "donchianSized"
  | "ensemble";

interface Oracle {
  symbol: string;
  bars: number;
  targetVol: number;
  emaTrendRaw: number[];
  donchianRaw: number[];
  sizedEma: number[];
  sizedDon: number[];
  ensemble: number[];
  backtests: Record<StrategyKey, OracleMetrics> & {
    buyAndHold: Pick<OracleMetrics, "finalEquity" | "totalReturn" | "maxDrawdown">;
    dca: Pick<OracleMetrics, "finalEquity" | "totalReturn" | "maxDrawdown">;
  };
}

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
const eth = toCandles(ethCandlesRaw as number[][]);
const oracles: [string, Candle[], Oracle][] = [
  ["BTCUSDT", btc, btcOracle as Oracle],
  ["ETHUSDT", eth, ethOracle as Oracle],
];

/** Element-wise comparison within a relative epsilon (absolute near zero). */
const expectArraysClose = (
  actual: number[],
  expected: number[],
  eps = 1e-9,
): void => {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < actual.length; i++) {
    const tol = Math.max(Math.abs(expected[i]) * eps, eps);
    if (Math.abs(actual[i] - expected[i]) > tol) {
      throw new Error(
        `arrays differ at index ${i}: actual=${actual[i]} expected=${expected[i]}`,
      );
    }
  }
};

const expectMetricsClose = (
  actual: { totalReturn: number; maxDrawdown: number; sharpe: number },
  expected: OracleMetrics,
): void => {
  // §8: floats within ~0.1% relative.
  expect(actual.totalReturn).toBeCloseTo(expected.totalReturn, 3);
  expect(
    Math.abs(actual.totalReturn - expected.totalReturn) /
      Math.abs(expected.totalReturn),
  ).toBeLessThan(0.001);
  expect(
    Math.abs(actual.maxDrawdown - expected.maxDrawdown) /
      Math.abs(expected.maxDrawdown),
  ).toBeLessThan(0.001);
  expect(
    Math.abs(actual.sharpe - expected.sharpe) / Math.abs(expected.sharpe),
  ).toBeLessThan(0.001);
};

describe.each(oracles)("parity vs Python oracle — %s", (_sym, candles, oracle) => {
  it("has the exact validated series (3242 daily bars)", () => {
    expect(candles).toHaveLength(3242);
    expect(oracle.bars).toBe(3242);
  });

  it("emaTrendPositions matches the oracle raw array exactly", () => {
    expect(emaTrendPositions(candles)).toEqual(oracle.emaTrendRaw);
  });

  it("donchianPositions matches the oracle raw array exactly", () => {
    expect(donchianPositions(candles)).toEqual(oracle.donchianRaw);
  });

  it("applyRisk matches the oracle sized arrays within 1e-9", () => {
    expectArraysClose(
      applyRisk(candles, emaTrendPositions(candles), { targetVol: 0.6 }),
      oracle.sizedEma,
    );
    expectArraysClose(
      applyRisk(candles, donchianPositions(candles), { targetVol: 0.6 }),
      oracle.sizedDon,
    );
  });

  it("ensembleTarget matches the oracle ensemble within 1e-9", () => {
    expectArraysClose(ensembleTarget(candles, { targetVol: 0.6 }), oracle.ensemble);
  });

  const strategyCases: [StrategyKey, () => number[]][] = [
    ["emaTrendRaw", (): number[] => emaTrendPositions(candles)],
    ["donchianRaw", (): number[] => donchianPositions(candles)],
    [
      "emaTrendSized",
      (): number[] =>
        applyRisk(candles, emaTrendPositions(candles), { targetVol: 0.6 }),
    ],
    [
      "donchianSized",
      (): number[] =>
        applyRisk(candles, donchianPositions(candles), { targetVol: 0.6 }),
    ],
    ["ensemble", (): number[] => ensembleTarget(candles, { targetVol: 0.6 })],
  ];

  it.each(strategyCases)("backtest(%s) reproduces the oracle metrics (trade counts exact)", (key, mk) => {
    const res = runBacktest(candles, mk());
    const expected = oracle.backtests[key];
    expectMetricsClose(res, expected);
    expect(res.nTrades).toBe(expected.nTrades);
  });
});

describe("§4 anchor numbers (from HODL-HANDOVER.md)", () => {
  it("ema_trend RAW BTC: +1543.4% / −42.4% / Sharpe 1.00 / exactly 28 trades", () => {
    const res = runBacktest(btc, emaTrendPositions(btc));
    expect(res.totalReturn).toBeCloseTo(15.434, 2);
    expect(res.maxDrawdown).toBeCloseTo(-0.424, 2);
    expect(res.sharpe).toBeCloseTo(1.0, 1);
    expect(res.nTrades).toBe(28);
  });

  it("ema_trend RAW ETH: +1496.2% / −65.8% / Sharpe 0.86", () => {
    const res = runBacktest(eth, emaTrendPositions(eth));
    expect(res.totalReturn).toBeCloseTo(14.962, 2);
    expect(res.maxDrawdown).toBeCloseTo(-0.658, 2);
    expect(res.sharpe).toBeCloseTo(0.86, 2);
  });

  it("sleeve ema+donchian (BTC+ETH, equal capital, daily-rebalanced): +1513% / −34% / Sharpe 1.15", () => {
    // The reference (trading/runners/sleeve_runner.py) combines PER-CELL
    // backtests — one account per asset × strategy (4 cells), equal-weight
    // average of their daily returns, rebalanced daily — not a backtest of
    // the averaged ensemble signal.
    const cellRets: number[][] = [];
    for (const candles of [btc, eth]) {
      for (const raw of [emaTrendPositions(candles), donchianPositions(candles)]) {
        const eq = runBacktest(
          candles,
          applyRisk(candles, raw, { targetVol: 0.6 }),
        ).equity;
        cellRets.push(eq.slice(1).map((v, i) => v / eq[i] - 1));
      }
    }
    const bars = Math.min(...cellRets.map((r) => r.length));
    const combined = [1000];
    for (let i = 0; i < bars; i++) {
      const mean =
        cellRets.reduce((s, r) => s + r[i], 0) / cellRets.length;
      combined.push(combined[combined.length - 1] * (1 + mean));
    }

    const totalReturn = combined[combined.length - 1] / 1000 - 1;
    let peak = combined[0];
    let mdd = 0;
    for (const v of combined) {
      peak = Math.max(peak, v);
      mdd = Math.min(mdd, v / peak - 1);
    }
    const rets = combined.slice(1).map((v, i) => v / combined[i] - 1);
    const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
    const sd = Math.sqrt(
      rets.reduce((s, r) => s + (r - mean) * (r - mean), 0) / rets.length,
    );
    const sharpeCombined = (mean / sd) * Math.sqrt(365);

    expect(totalReturn).toBeCloseTo(15.13, 1);
    expect(mdd).toBeCloseTo(-0.34, 1);
    expect(sharpeCombined).toBeCloseTo(1.15, 1);
  });
});

describe("rebalance threshold parameter (D5 — do not unify the two modes)", () => {
  it("fraction-of-equity 0.001 (paper loop) trades less than absolute 1e-9 (oracle)", () => {
    const target = ensembleTarget(btc, { targetVol: 0.6 });
    const absolute = runBacktest(btc, target, {
      threshold: { kind: "absolute", value: 1e-9 },
    });
    const fractional = runBacktest(btc, target, {
      threshold: { kind: "fraction_of_equity", value: 0.001 },
    });
    // The fractional threshold skips micro-rebalances, so the two modes must
    // NOT be interchangeable; the oracle numbers depend on the absolute one.
    expect(fractional.equity.length).toBe(absolute.equity.length);
    expect(fractional.finalEquity).not.toBe(absolute.finalEquity);
  });
});
