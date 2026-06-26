import { parseTransactionsCsv, transactionsToCsv } from "@/lib/csv";
import type { Transaction } from "@/lib/types";

const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: "1",
  coinId: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  image: "https://example.com/btc.png",
  type: "buy",
  quantity: 0.5,
  amount: 25000,
  date: Date.parse("2024-01-15T00:00:00"),
  createdAt: 0,
  ...over,
});

describe("transactionsToCsv", () => {
  it("emits a header and one row per transaction", () => {
    const csv = transactionsToCsv([tx()]);
    const [header, row] = csv.split("\n");
    expect(header).toBe("Date,Coin,Symbol,Name,Type,Quantity,Amount,Image");
    expect(row).toContain("2024-01-15");
    expect(row).toContain("bitcoin");
    expect(row).toContain("25000");
  });

  it("quotes fields containing commas", () => {
    const csv = transactionsToCsv([tx({ name: "Wrapped, Token" })]);
    expect(csv).toContain('"Wrapped, Token"');
  });
});

describe("parseTransactionsCsv", () => {
  it("round-trips an exported file", () => {
    const original = [
      tx({ coinId: "bitcoin", symbol: "btc", name: "Bitcoin" }),
      tx({
        coinId: "ethereum",
        symbol: "eth",
        name: "Ethereum",
        type: "sell",
        quantity: 2,
        amount: 4000,
      }),
    ];
    const { rows, errors } = parseTransactionsCsv(transactionsToCsv(original));
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      coinId: "bitcoin",
      type: "buy",
      quantity: 0.5,
      amount: 25000,
    });
    expect(rows[1]).toMatchObject({ coinId: "ethereum", type: "sell" });
  });

  it("is tolerant of column order and case", () => {
    const csv = ["amount,TYPE,Quantity,coin,date", "100,BUY,1,bitcoin,2024-02-01"].join(
      "\n",
    );
    const { rows, errors } = parseTransactionsCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ coinId: "bitcoin", type: "buy", amount: 100 });
    // optional columns fall back to the coin id
    expect(rows[0].symbol).toBe("bitcoin");
  });

  it("reports missing required columns", () => {
    const { errors } = parseTransactionsCsv("date,coin\n2024-01-01,bitcoin");
    expect(errors[0]).toMatch(/missing required column/i);
  });

  it("collects per-row errors and keeps valid rows", () => {
    const csv = [
      "Date,Coin,Type,Quantity,Amount",
      "2024-01-01,bitcoin,buy,1,100", // valid
      "2024-01-02,ethereum,hodl,1,100", // bad type
      "not-a-date,bitcoin,buy,1,100", // bad date
      "2024-01-03,bitcoin,buy,-1,100", // bad quantity
      "2024-01-04,,buy,1,100", // missing coin
    ].join("\n");
    const { rows, errors } = parseTransactionsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(4);
    expect(errors.some((e) => /type/.test(e))).toBe(true);
    expect(errors.some((e) => /date/.test(e))).toBe(true);
  });

  it("returns an error for an empty file", () => {
    expect(parseTransactionsCsv("   ").errors[0]).toMatch(/empty/i);
  });
});
