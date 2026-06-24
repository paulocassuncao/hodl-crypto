import { buildCompareData, normalizeSeries } from "@/lib/compare";
import type { ChartPoint } from "@/lib/types";

const pts = (...prices: number[]): ChartPoint[] =>
  prices.map((price, i) => ({ time: i * 1000, price }));

describe("normalizeSeries", () => {
  it("returns empty for empty input", () => {
    expect(normalizeSeries([])).toEqual([]);
  });

  it("starts at 0% and tracks % change from the first point", () => {
    expect(normalizeSeries(pts(100, 150, 50))).toEqual([0, 50, -50]);
  });

  it("doubling is +100%", () => {
    expect(normalizeSeries(pts(10, 20))).toEqual([0, 100]);
  });

  it("returns zeros when the base price is 0", () => {
    expect(normalizeSeries(pts(0, 5, 10))).toEqual([0, 0, 0]);
  });
});

describe("buildCompareData", () => {
  it("merges series by index, keyed by coin id", () => {
    const data = buildCompareData([
      { id: "btc", points: pts(100, 200) },
      { id: "eth", points: pts(50, 75) },
    ]);
    expect(data).toEqual([
      { time: 0, btc: 0, eth: 0 },
      { time: 1000, btc: 100, eth: 50 },
    ]);
  });

  it("aligns to the shortest series", () => {
    const data = buildCompareData([
      { id: "btc", points: pts(100, 200, 300) },
      { id: "eth", points: pts(50, 100) },
    ]);
    expect(data).toHaveLength(2);
  });

  it("ignores empty series", () => {
    const data = buildCompareData([
      { id: "btc", points: pts(100, 200) },
      { id: "eth", points: [] },
    ]);
    expect(data).toEqual([
      { time: 0, btc: 0 },
      { time: 1000, btc: 100 },
    ]);
  });

  it("returns empty when all series are empty", () => {
    expect(buildCompareData([{ id: "btc", points: [] }])).toEqual([]);
  });
});
