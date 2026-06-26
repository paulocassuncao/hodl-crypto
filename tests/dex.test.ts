import { normalizePools, type GtPoolsResponse } from "@/lib/dex";

const sample: GtPoolsResponse = {
  data: [
    {
      id: "eth_0xpool1",
      attributes: {
        name: "WETH / USDC 0.05%",
        address: "0xpool1",
        base_token_price_usd: "3500.25",
        price_change_percentage: { h24: "-2.5" },
        volume_usd: { h24: "1250000.5" },
        reserve_in_usd: "8000000",
      },
      relationships: {
        base_token: { data: { id: "eth_weth", type: "token" } },
        quote_token: { data: { id: "eth_usdc", type: "token" } },
        dex: { data: { id: "uniswap_v3", type: "dex" } },
      },
    },
    {
      id: "eth_0xpool2",
      attributes: {
        name: "PEPE / WETH",
        address: "0xpool2",
        base_token_price_usd: "0.0000012",
        price_change_percentage: { h24: null },
        volume_usd: { h24: null },
        reserve_in_usd: null,
      },
      relationships: {
        base_token: { data: { id: "eth_pepe", type: "token" } },
      },
    },
  ],
  included: [
    { id: "eth_weth", type: "token", attributes: { symbol: "WETH" } },
    { id: "eth_usdc", type: "token", attributes: { symbol: "USDC" } },
    { id: "eth_pepe", type: "token", attributes: { symbol: "PEPE" } },
    { id: "uniswap_v3", type: "dex", attributes: { name: "Uniswap V3" } },
  ],
};

describe("normalizePools", () => {
  it("joins token symbols and dex names from included[]", () => {
    const [p] = normalizePools(sample, "eth");
    expect(p).toMatchObject({
      id: "eth_0xpool1",
      network: "eth",
      address: "0xpool1",
      baseSymbol: "WETH",
      quoteSymbol: "USDC",
      dex: "Uniswap V3",
      priceUsd: 3500.25,
      priceChange24h: -2.5,
      volume24h: 1250000.5,
      liquidityUsd: 8000000,
    });
  });

  it("parses string numbers and tolerates missing fields", () => {
    const p = normalizePools(sample, "eth")[1];
    expect(p.priceUsd).toBeCloseTo(0.0000012);
    expect(p.priceChange24h).toBeNull(); // h24 was null
    expect(p.volume24h).toBe(0); // missing → 0
    expect(p.liquidityUsd).toBe(0);
    expect(p.baseSymbol).toBe("PEPE");
    expect(p.quoteSymbol).toBe(""); // no quote relationship
  });

  it("handles an empty payload", () => {
    expect(normalizePools({ data: [] }, "eth")).toEqual([]);
  });
});
