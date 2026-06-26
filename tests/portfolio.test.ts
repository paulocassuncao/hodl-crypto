import {
  allocations,
  bestWorstPerformers,
  derivePositions,
  holdingValue,
  pnlPct,
  portfolioTotals,
  whatIf,
  type PriceMap,
} from "@/lib/portfolio-core";
import type { Position, Transaction } from "@/lib/types";

let seq = 0;
const tx = (over: Partial<Transaction>): Transaction => ({
  id: String(++seq),
  coinId: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  image: "",
  type: "buy",
  quantity: 1,
  amount: 100,
  date: seq,
  createdAt: seq,
  ...over,
});

const position = (over: Partial<Position>): Position => ({
  coinId: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  image: "",
  quantity: 1,
  costBasis: 100,
  realized: 0,
  realizedCost: 0,
  ...over,
});

describe("holdingValue / pnlPct", () => {
  it("computes value and percent for a gain", () => {
    expect(holdingValue(2, 150)).toBe(300);
    expect(pnlPct(300, 200)).toBeCloseTo(50);
  });

  it("treats zero cost as 0% rather than dividing by zero", () => {
    expect(pnlPct(50, 0)).toBe(0);
  });
});

describe("derivePositions (average cost)", () => {
  it("averages multiple buys of the same coin", () => {
    const [pos] = derivePositions([
      tx({ type: "buy", quantity: 1, amount: 100, date: 1 }),
      tx({ type: "buy", quantity: 1, amount: 300, date: 2 }),
    ]);
    expect(pos.quantity).toBe(2);
    expect(pos.costBasis).toBe(400); // avg cost 200/unit
    expect(pos.realized).toBe(0);
  });

  it("books realized P&L and reduces cost on a partial sell", () => {
    const [pos] = derivePositions([
      tx({ type: "buy", quantity: 2, amount: 400, date: 1 }), // avg 200
      tx({ type: "sell", quantity: 1, amount: 250, date: 2 }), // proceeds 250
    ]);
    expect(pos.quantity).toBe(1);
    expect(pos.costBasis).toBeCloseTo(200);
    expect(pos.realized).toBeCloseTo(50); // 250 − 200
    expect(pos.realizedCost).toBeCloseTo(200); // cost of the unit sold
  });

  it("handles selling the entire position", () => {
    const [pos] = derivePositions([
      tx({ type: "buy", quantity: 2, amount: 400, date: 1 }),
      tx({ type: "sell", quantity: 2, amount: 500, date: 2 }),
    ]);
    expect(pos.quantity).toBe(0);
    expect(pos.costBasis).toBeCloseTo(0);
    expect(pos.realized).toBeCloseTo(100); // 500 − 400
  });

  it("clamps an oversell to the units actually held", () => {
    const [pos] = derivePositions([
      tx({ type: "buy", quantity: 1, amount: 100, date: 1 }),
      tx({ type: "sell", quantity: 5, amount: 1000, date: 2 }), // only 1 held
    ]);
    expect(pos.quantity).toBe(0);
    // proceeds attributed to the 1 unit held: 1000 * (1/5) = 200; cost 100.
    expect(pos.realized).toBeCloseTo(100);
  });

  it("processes transactions in chronological order regardless of input order", () => {
    const [pos] = derivePositions([
      tx({ type: "sell", quantity: 1, amount: 250, date: 2 }),
      tx({ type: "buy", quantity: 2, amount: 400, date: 1 }),
    ]);
    expect(pos.quantity).toBe(1);
    expect(pos.realized).toBeCloseTo(50);
  });

  it("keeps separate positions per coin", () => {
    const positions = derivePositions([
      tx({ coinId: "bitcoin", quantity: 1, amount: 100 }),
      tx({ coinId: "ethereum", symbol: "eth", quantity: 2, amount: 50 }),
    ]);
    expect(positions).toHaveLength(2);
  });
});

describe("portfolioTotals", () => {
  const positions: Position[] = [
    position({ coinId: "bitcoin", quantity: 2, costBasis: 200, realized: 25 }),
    position({ coinId: "ethereum", quantity: 10, costBasis: 100, realized: 0 }),
  ];
  const prices: PriceMap = {
    bitcoin: { usd: 150, usd_24h_change: 50 }, // value 300, was 200
    ethereum: { usd: 20, usd_24h_change: 0 }, // value 200, flat
  };

  it("sums value, cost, unrealized and realized pnl", () => {
    const t = portfolioTotals(positions, prices);
    expect(t.value).toBe(500);
    expect(t.cost).toBe(300);
    expect(t.pnl).toBe(200);
    expect(t.realized).toBe(25);
    expect(t.pnlPct).toBeCloseTo((200 / 300) * 100);
  });

  it("reconstructs 24h change from per-coin percentages", () => {
    const t = portfolioTotals(positions, prices);
    expect(t.change24h).toBeCloseTo(100);
    expect(t.change24hPct).toBeCloseTo(25);
  });

  it("returns zeros for an empty portfolio", () => {
    const t = portfolioTotals([], {});
    expect(t).toMatchObject({ value: 0, cost: 0, pnl: 0, realized: 0 });
  });
});

describe("allocations", () => {
  it("returns shares summing to 100%, largest first", () => {
    const positions: Position[] = [
      position({ coinId: "bitcoin", quantity: 1 }),
      position({ coinId: "ethereum", quantity: 1 }),
    ];
    const prices: PriceMap = {
      bitcoin: { usd: 300 },
      ethereum: { usd: 100 },
    };
    const rows = allocations(positions, prices);
    expect(rows[0]).toMatchObject({ coinId: "bitcoin", pct: 75 });
    expect(rows[1]).toMatchObject({ coinId: "ethereum", pct: 25 });
  });

  it("returns 0% allocations when total value is zero", () => {
    const rows = allocations([position({ coinId: "x", quantity: 1 })], {});
    expect(rows[0].pct).toBe(0);
  });
});

describe("portfolioTotals realized %", () => {
  it("expresses realized P&L as a percent of the cost of units sold", () => {
    const positions: Position[] = [
      position({ coinId: "bitcoin", realized: 50, realizedCost: 200 }),
    ];
    const t = portfolioTotals(positions, { bitcoin: { usd: 0 } });
    expect(t.realizedCost).toBe(200);
    expect(t.realizedPct).toBeCloseTo(25); // 50 / 200
  });

  it("is 0% when nothing has been sold", () => {
    const t = portfolioTotals([position({ realizedCost: 0 })], {});
    expect(t.realizedPct).toBe(0);
  });
});

describe("bestWorstPerformers", () => {
  const positions: Position[] = [
    position({ coinId: "bitcoin", quantity: 1, costBasis: 100 }),
    position({ coinId: "ethereum", quantity: 1, costBasis: 100 }),
  ];
  const prices: PriceMap = {
    bitcoin: { usd: 150 }, // +50%
    ethereum: { usd: 80 }, // −20%
  };

  it("picks the highest and lowest unrealized P&L %", () => {
    const { best, worst } = bestWorstPerformers(positions, prices);
    expect(best?.coinId).toBe("bitcoin");
    expect(best?.pnlPct).toBeCloseTo(50);
    expect(worst?.coinId).toBe("ethereum");
    expect(worst?.pnlPct).toBeCloseTo(-20);
  });

  it("ignores closed and zero-cost positions; returns nulls when none qualify", () => {
    expect(bestWorstPerformers([], {})).toEqual({ best: null, worst: null });
    const closed = [position({ quantity: 0, costBasis: 0 })];
    expect(bestWorstPerformers(closed, {})).toEqual({ best: null, worst: null });
  });
});

describe("whatIf", () => {
  const positions: Position[] = [
    position({ coinId: "bitcoin", quantity: 1, costBasis: 100 }),
  ];
  const prices: PriceMap = { bitcoin: { usd: 200 } };

  it("projects added units, blended P&L, and allocation", () => {
    const result = whatIf(positions, prices, "bitcoin", 200);
    expect(result?.addedUnits).toBeCloseTo(1); // $200 / $200
    expect(result?.newValue).toBeCloseTo(400); // 200 held + 200 added
    expect(result?.newCost).toBeCloseTo(300); // 100 + 200
    expect(result?.newPnl).toBeCloseTo(100);
    expect(result?.newAvgCost).toBeCloseTo(150); // (100 + 200) / 2 units
    expect(result?.newAllocationPct).toBeCloseTo(100); // only holding
  });

  it("returns null for a non-positive amount or unknown price", () => {
    expect(whatIf(positions, prices, "bitcoin", 0)).toBeNull();
    expect(whatIf(positions, {}, "bitcoin", 100)).toBeNull();
  });
});
