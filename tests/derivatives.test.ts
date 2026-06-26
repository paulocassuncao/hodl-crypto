import { normalizeDerivatives, type RawDerivative } from "@/lib/derivatives";

const raw: RawDerivative[] = [
  {
    market: "Binance (Futures)",
    symbol: "BTCUSDT",
    price: "60000.5",
    funding_rate: 0.01,
    open_interest: 5_000_000_000,
    volume_24h: "20000000000",
    contract_type: "perpetual",
  },
  {
    market: "OKX",
    symbol: "ETHUSDT",
    price: 3000,
    funding_rate: "-0.005",
    open_interest: 9_000_000_000,
    volume_24h: 8_000_000_000,
    contract_type: "perpetual",
  },
  {
    market: "Weird",
    symbol: "FOO",
    price: null,
    funding_rate: null,
    open_interest: null,
    volume_24h: null,
  },
];

describe("normalizeDerivatives", () => {
  it("coerces string numbers and sorts by open interest desc", () => {
    const out = normalizeDerivatives(raw);
    expect(out[0].symbol).toBe("ETHUSDT"); // 9B > 5B
    expect(out[0].price).toBe(3000);
    expect(out[0].fundingRatePct).toBeCloseTo(-0.005);
    expect(out[1].symbol).toBe("BTCUSDT");
    expect(out[1].volume24hUsd).toBe(20_000_000_000);
  });

  it("treats missing numerics as 0 and null funding as null", () => {
    const foo = normalizeDerivatives(raw).find((d) => d.symbol === "FOO")!;
    expect(foo.price).toBe(0);
    expect(foo.openInterestUsd).toBe(0);
    expect(foo.fundingRatePct).toBeNull();
  });

  it("caps the list to the requested limit", () => {
    expect(normalizeDerivatives(raw, 1)).toHaveLength(1);
    expect(normalizeDerivatives(raw, 1)[0].symbol).toBe("ETHUSDT");
  });
});
