import { simulateDca } from "@/lib/dca";
import type { ChartPoint } from "@/lib/types";

const DAY = 24 * 60 * 60 * 1000;

/** Build a daily price series of length `prices.length` starting at t=0. */
const series = (prices: number[]): ChartPoint[] =>
  prices.map((price, i) => ({ time: i * DAY, price }));

describe("simulateDca", () => {
  it("returns null for empty series or non-positive inputs", () => {
    expect(simulateDca([], 100, 7)).toBeNull();
    expect(simulateDca(series([10]), 0, 7)).toBeNull();
    expect(simulateDca(series([10]), 100, 0)).toBeNull();
  });

  it("accumulates units across periodic buys at a flat price", () => {
    // 5 daily points, buy $100 every day at price 10 → 5 buys, 50 units.
    const r = simulateDca(series([10, 10, 10, 10, 10]), 100, 1)!;
    expect(r.buys).toBe(5);
    expect(r.invested).toBe(500);
    expect(r.units).toBeCloseTo(50);
    expect(r.avgCost).toBeCloseTo(10);
    expect(r.finalValue).toBeCloseTo(500);
    expect(r.roiPct).toBeCloseTo(0);
  });

  it("buys more units when the price is low (lowers average cost)", () => {
    // Buy at 10 then at 5; final price 5.
    const r = simulateDca(series([10, 5]), 100, 1)!;
    // units = 100/10 + 100/5 = 10 + 20 = 30; invested 200; avg ~6.67
    expect(r.units).toBeCloseTo(30);
    expect(r.avgCost).toBeCloseTo(200 / 30);
    expect(r.finalValue).toBeCloseTo(150); // 30 * 5
    expect(r.pnl).toBeCloseTo(-50);
  });

  it("compares against a lump sum at the first price", () => {
    const r = simulateDca(series([10, 5]), 100, 1)!;
    // lump sum: 200 at price 10 = 20 units, final value 20 * 5 = 100
    expect(r.lumpSumValue).toBeCloseTo(100);
    expect(r.lumpSumRoiPct).toBeCloseTo(-50);
    // DCA (150) beats lump sum (100) when price falls then is bought cheaper
    expect(r.finalValue).toBeGreaterThan(r.lumpSumValue);
  });

  it("respects the buy frequency", () => {
    // 7 daily points, weekly cadence → only the first day buys.
    const r = simulateDca(series([10, 10, 10, 10, 10, 10, 10]), 100, 7)!;
    expect(r.buys).toBe(1);
  });
});
