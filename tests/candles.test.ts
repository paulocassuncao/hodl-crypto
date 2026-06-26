import {
  CANDLE_DOWN,
  CANDLE_UP,
  candleColor,
  candleDomain,
  candleGeometry,
  isUpCandle,
  valueToY,
} from "@/lib/candles";

describe("candle direction & color", () => {
  it("treats close >= open as up", () => {
    expect(isUpCandle({ open: 10, high: 12, low: 9, close: 11 })).toBe(true);
    expect(isUpCandle({ open: 10, high: 12, low: 9, close: 10 })).toBe(true);
    expect(isUpCandle({ open: 10, high: 12, low: 9, close: 9.5 })).toBe(false);
  });

  it("maps direction to gain/loss tokens", () => {
    expect(candleColor({ open: 10, high: 12, low: 9, close: 11 })).toBe(
      CANDLE_UP,
    );
    expect(candleColor({ open: 10, high: 12, low: 9, close: 8 })).toBe(
      CANDLE_DOWN,
    );
  });
});

describe("valueToY", () => {
  it("maps high to the top and low to the bottom of the rect", () => {
    expect(valueToY(20, 20, 10, 100, 200)).toBe(100); // high → y
    expect(valueToY(10, 20, 10, 100, 200)).toBe(300); // low → y + height
    expect(valueToY(15, 20, 10, 100, 200)).toBe(200); // midpoint
  });

  it("returns the top for a flat candle (no division by zero)", () => {
    expect(valueToY(10, 10, 10, 50, 200)).toBe(50);
  });
});

describe("candleGeometry", () => {
  const rect = { x: 0, y: 100, width: 10, height: 200 };

  it("centers the wick and spans the full high-low range", () => {
    const g = candleGeometry({ open: 12, high: 20, low: 10, close: 18 }, rect);
    expect(g.wickX).toBe(5);
    expect(g.wickTop).toBe(100); // high
    expect(g.wickBottom).toBe(300); // low
  });

  it("places the body between open and close", () => {
    const g = candleGeometry({ open: 12, high: 20, low: 10, close: 18 }, rect);
    // close (18) is the body top, open (12) is the body bottom
    expect(g.bodyY).toBeCloseTo(valueToY(18, 20, 10, 100, 200));
    expect(g.bodyY + g.bodyHeight).toBeCloseTo(valueToY(12, 20, 10, 100, 200));
    expect(g.isUp).toBe(true);
  });

  it("enforces a minimum body height for doji candles", () => {
    const g = candleGeometry(
      { open: 15, high: 20, low: 10, close: 15 },
      rect,
      0.6,
      2,
    );
    expect(g.bodyHeight).toBe(2);
  });

  it("narrows the body relative to the slot width", () => {
    const g = candleGeometry({ open: 12, high: 20, low: 10, close: 18 }, rect);
    expect(g.bodyWidth).toBeCloseTo(6); // 10 * 0.6
    expect(g.bodyX).toBeCloseTo(2); // centered: 5 - 3
  });
});

describe("candleDomain", () => {
  it("returns [0, 0] for an empty series", () => {
    expect(candleDomain([])).toEqual([0, 0]);
  });

  it("pads slightly beyond the min low and max high", () => {
    const [lo, hi] = candleDomain([
      { open: 10, high: 15, low: 8, close: 12 },
      { open: 12, high: 20, low: 11, close: 19 },
    ]);
    expect(lo).toBeLessThan(8);
    expect(hi).toBeGreaterThan(20);
  });
});
