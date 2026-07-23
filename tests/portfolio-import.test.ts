import {
  isHoldingArray,
  isTransactionArray,
  parseImport,
} from "@/lib/portfolio-import";
import { toRow } from "@/lib/supabase/types";
import type { Holding, Transaction } from "@/lib/types";

const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: "t1",
  coinId: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  image: "img",
  type: "buy",
  quantity: 1,
  amount: 100,
  date: 1_700_000_000_000,
  createdAt: 1_700_000_000_000,
  ...over,
});

const holding = (over: Partial<Holding> = {}): Holding => ({
  id: "h1",
  coinId: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  image: "img",
  quantity: 1,
  cost: 100,
  createdAt: 1_700_000_000_000,
  ...over,
});

describe("isTransactionArray", () => {
  it("accepts a well-formed export", () => {
    expect(isTransactionArray([tx()])).toBe(true);
    expect(isTransactionArray([])).toBe(true);
  });

  it.each([
    ["missing date", { date: undefined }],
    ["missing createdAt", { createdAt: undefined }],
    ["NaN date", { date: NaN }],
    ["Infinity amount", { amount: Infinity }],
    ["string quantity", { quantity: "1" }],
    ["missing symbol", { symbol: undefined }],
    ["missing name", { name: undefined }],
    ["missing image", { image: undefined }],
    ["unknown type", { type: "transfer" }],
  ])("rejects a row with %s", (_label, over) => {
    expect(isTransactionArray([{ ...tx(), ...over }])).toBe(false);
  });

  it("rejects when a single row in an otherwise valid file is bad", () => {
    expect(isTransactionArray([tx(), { ...tx(), date: undefined }])).toBe(false);
  });
});

describe("isHoldingArray", () => {
  it("accepts the legacy shape and rejects one without a createdAt", () => {
    expect(isHoldingArray([holding()])).toBe(true);
    expect(isHoldingArray([{ ...holding(), createdAt: undefined }])).toBe(false);
  });
});

describe("parseImport", () => {
  it("returns null for a file with any unusable row, never a partial ledger", () => {
    const file = JSON.stringify([tx(), { ...tx(), id: "t2", date: undefined }]);
    expect(parseImport(file)).toBeNull();
  });

  it("migrates the legacy holding shape into a buy", () => {
    const parsed = parseImport(JSON.stringify([holding()]));
    expect(parsed).toHaveLength(1);
    expect(parsed?.[0]).toMatchObject({
      coinId: "bitcoin",
      type: "buy",
      quantity: 1,
      amount: 100,
      date: 1_700_000_000_000,
    });
  });

  it("returns null for a shape that is neither transactions nor holdings", () => {
    expect(parseImport(JSON.stringify({ hello: "world" }))).toBeNull();
    expect(parseImport(JSON.stringify([1, 2, 3]))).toBeNull();
  });

  it("guarantees every parsed row survives toRow — the write can't blow up mid-restore", () => {
    const parsed = parseImport(JSON.stringify([tx(), holding()].slice(0, 1)));
    expect(parsed).not.toBeNull();
    expect(() => parsed?.map((t) => toRow(t, "user-1"))).not.toThrow();
  });
});
