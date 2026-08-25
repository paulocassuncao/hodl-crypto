import { radarToCsv } from "@/lib/radar-csv";
import type { Coin } from "@/lib/types";

const coin = (over: Partial<Coin>): Coin =>
  ({
    id: "x",
    symbol: "x",
    name: "X",
    image: "",
    current_price: 1,
    market_cap: 1,
    market_cap_rank: 1,
    total_volume: 1,
    price_change_percentage_1h_in_currency: null,
    price_change_percentage_24h_in_currency: null,
    price_change_percentage_7d_in_currency: null,
    price_change_percentage_30d_in_currency: null,
    sparkline_in_7d: { price: [] },
    ...over,
  }) as Coin;

const btc = coin({
  id: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  market_cap_rank: 1,
  current_price: 60_000,
  price_change_percentage_24h_in_currency: 2,
  price_change_percentage_7d_in_currency: 5,
});

const eth = coin({
  id: "ethereum",
  symbol: "eth",
  name: "Ethereum",
  market_cap_rank: 2,
  current_price: 3_000,
  price_change_percentage_24h_in_currency: 8,
  price_change_percentage_7d_in_currency: 1,
});

const cells = (csv: string, line: number): string[] =>
  csv.split("\n")[line].split(",");

describe("radarToCsv", () => {
  it("exports change relative to BTC, not the absolute change", () => {
    const csv = radarToCsv([eth], btc, "usd");
    const [, , , , h1, h24, h7d] = cells(csv, 1);

    // ETH +8% against BTC +2% is +6 of excess return; the absolute 8 would be
    // the number the Table lens exports, and it is the wrong one here.
    expect(h24).toBe("6");
    expect(h7d).toBe("-4");
    expect(h1).toBe("");
  });

  it("puts Bitcoin itself on the 0% baseline", () => {
    const csv = radarToCsv([btc], btc, "usd");
    const [, , , , , h24, h7d] = cells(csv, 1);
    expect(h24).toBe("0");
    expect(h7d).toBe("0");
  });

  it("leaves the relative columns empty when there is no BTC baseline", () => {
    const csv = radarToCsv([eth], undefined, "usd");
    const [rank, name, symbol, price, h1, h24] = cells(csv, 1);

    // Absolute data exists for ETH here; without a baseline the *relative*
    // number is unknown, and an unknown must not be exported as the absolute.
    expect([rank, name, symbol, price]).toEqual([
      "2",
      "Ethereum",
      "ETH",
      "3000",
    ]);
    expect([h1, h24]).toEqual(["", ""]);
  });

  it("names the currency in the price header and labels the vs-BTC columns", () => {
    const headers = cells(radarToCsv([], btc, "eur"), 0);
    expect(headers).toEqual([
      "Rank",
      "Name",
      "Symbol",
      "Price (EUR)",
      "1h vs BTC (%)",
      "24h vs BTC (%)",
      "7d vs BTC (%)",
      "30d vs BTC (%)",
    ]);
  });

  it("quotes a name containing a comma so the columns do not shift", () => {
    const csv = radarToCsv(
      [coin({ name: "Foo, Inc.", symbol: "foo", market_cap_rank: 9 })],
      btc,
      "usd",
    );
    expect(csv.split("\n")[1]).toContain('"Foo, Inc."');
  });
});
