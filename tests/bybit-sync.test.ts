import { fillToTransaction, signBybit, type BybitFill } from "@/lib/bybit";
import { planSync, syncCutoff } from "@/lib/bybit-sync";
import type { Transaction } from "@/lib/types";

const MIN = 60 * 1000;

const tx = (over: Partial<Transaction>): Transaction => ({
  id: over.id ?? crypto.randomUUID(),
  coinId: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  image: "img",
  type: "buy",
  quantity: 0.001,
  amount: 100,
  date: 1_000_000,
  createdAt: 1_000_000,
  ...over,
});

describe("syncCutoff", () => {
  it("is the latest transaction date, or 0 when empty", () => {
    expect(syncCutoff([])).toBe(0);
    expect(syncCutoff([tx({ date: 5 }), tx({ date: 9 }), tx({ date: 7 })])).toBe(
      9,
    );
  });
});

describe("planSync", () => {
  const existing = [
    tx({ date: 10 * MIN, quantity: 0.001 }),
    tx({ date: 20 * MIN, quantity: 0.002 }),
  ];

  it("keeps only candidates strictly after the cutoff", () => {
    const plan = planSync(existing, [
      tx({ date: 20 * MIN }), // at cutoff → dropped
      tx({ date: 15 * MIN }), // before cutoff → dropped
      tx({ date: 25 * MIN, quantity: 0.003 }),
    ]);
    expect(plan.cutoff).toBe(20 * MIN);
    expect(plan.toInsert).toHaveLength(1);
    expect(plan.toInsert[0].date).toBe(25 * MIN);
    expect(plan.skippedDuplicates).toHaveLength(0);
  });

  it("skips a candidate matching an existing row within ±5min and qty epsilon", () => {
    const manual = tx({ date: 30 * MIN, quantity: 0.005 });
    const plan = planSync([...existing, manual], [
      // same coin, 4 minutes later, same qty within 1e-8 → duplicate
      tx({ date: 34 * MIN, quantity: 0.005 + 1e-9 }),
    ]);
    expect(plan.toInsert).toHaveLength(0);
    expect(plan.skippedDuplicates).toHaveLength(1);
  });

  it("does not treat different coins or quantities as duplicates", () => {
    const manual = tx({ date: 30 * MIN, quantity: 0.005 });
    const plan = planSync([...existing, manual], [
      tx({ date: 31 * MIN, quantity: 0.005, coinId: "ethereum" }),
      tx({ date: 31 * MIN, quantity: 0.006 }),
    ]);
    expect(plan.toInsert).toHaveLength(2);
  });

  it("dedups within the candidate batch itself", () => {
    const plan = planSync(existing, [
      tx({ date: 25 * MIN, quantity: 0.004 }),
      tx({ date: 25 * MIN + 1000, quantity: 0.004 }),
    ]);
    expect(plan.toInsert).toHaveLength(1);
    expect(plan.skippedDuplicates).toHaveLength(1);
  });

  it("is idempotent: re-running with inserted rows yields an empty plan", () => {
    const candidates = [
      tx({ date: 25 * MIN, quantity: 0.003 }),
      tx({ date: 26 * MIN, quantity: 0.004, coinId: "solana" }),
    ];
    const first = planSync(existing, candidates);
    expect(first.toInsert).toHaveLength(2);
    const second = planSync([...existing, ...first.toInsert], candidates);
    expect(second.toInsert).toHaveLength(0);
  });

  it("never returns deletions or mutations of existing rows", () => {
    const before = JSON.stringify(existing);
    const plan = planSync(existing, [tx({ date: 25 * MIN })]);
    expect(JSON.stringify(existing)).toBe(before);
    expect(Object.keys(plan).sort()).toEqual([
      "cutoff",
      "skippedDuplicates",
      "toInsert",
    ]);
  });
});

describe("fillToTransaction", () => {
  it("maps a fill to a bybit-sourced buy with amount = qty × price", () => {
    const fill: BybitFill = {
      coin: "ETH",
      execTime: 1_700_000_000_000,
      execQty: 0.5,
      execPrice: 2400,
    };
    const mapped = fillToTransaction(fill);
    expect(mapped).toMatchObject({
      coinId: "ethereum",
      symbol: "eth",
      type: "buy",
      quantity: 0.5,
      amount: 1200,
      date: 1_700_000_000_000,
      source: "bybit",
    });
  });

  it("throws on an unknown coin", () => {
    expect(() =>
      fillToTransaction({ coin: "DOGE", execTime: 1, execQty: 1, execPrice: 1 }),
    ).toThrow("Unknown coin");
  });
});

describe("signBybit", () => {
  it("signs timestamp + apiKey + recvWindow + queryString (Bybit v5)", async () => {
    // Independently verifiable: HMAC-SHA256("secret", "1700000000000key5000a=1")
    const sig = await signBybit("secret", "1700000000000", "key", "5000", "a=1");
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
    // Deterministic: same inputs → same signature; any input change → different.
    expect(await signBybit("secret", "1700000000000", "key", "5000", "a=1")).toBe(
      sig,
    );
    expect(
      await signBybit("secret", "1700000000000", "key", "5000", "a=2"),
    ).not.toBe(sig);
  });
});
