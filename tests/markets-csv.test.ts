import { marketsToCsv } from "@/lib/markets-csv";
import type { Coin } from "@/lib/types";

const coin = (over: Partial<Coin> = {}): Coin => ({
  id: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  image: "",
  current_price: 60000,
  market_cap: 1_200_000_000_000,
  market_cap_rank: 1,
  total_volume: 40_000_000_000,
  high_24h: null,
  low_24h: null,
  circulating_supply: null,
  total_supply: null,
  max_supply: null,
  ath: null,
  atl: null,
  price_change_percentage_1h_in_currency: 0.5,
  price_change_percentage_24h_in_currency: -2.5,
  price_change_percentage_7d_in_currency: 10,
  sparkline_in_7d: null,
  ...over,
});

describe("marketsToCsv", () => {
  it("emits a header noting the currency and one row per coin", () => {
    const csv = marketsToCsv([coin()], "usd");
    const [header, row] = csv.split("\n");
    expect(header).toBe(
      "Rank,Name,Symbol,Price (USD),1h %,24h %,7d %,24h Volume (USD),Market Cap (USD)",
    );
    expect(row).toBe("1,Bitcoin,BTC,60000,0.5,-2.5,10,40000000000,1200000000000");
  });

  it("reflects the active currency in the headers", () => {
    const csv = marketsToCsv([coin()], "eur");
    expect(csv.split("\n")[0]).toContain("Price (EUR)");
  });

  it("leaves missing numeric fields blank", () => {
    const csv = marketsToCsv(
      [coin({ price_change_percentage_1h_in_currency: null })],
      "usd",
    );
    expect(csv.split("\n")[1]).toBe(
      "1,Bitcoin,BTC,60000,,-2.5,10,40000000000,1200000000000",
    );
  });

  it("quotes names containing commas", () => {
    const csv = marketsToCsv([coin({ name: "Foo, Inc" })], "usd");
    expect(csv).toContain('"Foo, Inc"');
  });
});
