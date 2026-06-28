import {
  applyFilters,
  conditionLabel,
  decodeRadarState,
  encodeRadarState,
  metricValue,
  PRESETS,
  tvSymbol,
  type FilterCondition,
  type RadarState,
} from "@/lib/radar";
import type { Coin } from "@/lib/types";

const coin = (over: Partial<Coin> & Pick<Coin, "id" | "symbol">): Coin => ({
  name: over.id,
  image: "",
  current_price: 0,
  market_cap: 0,
  market_cap_rank: 0,
  total_volume: 0,
  high_24h: null,
  low_24h: null,
  circulating_supply: null,
  total_supply: null,
  max_supply: null,
  ath: null,
  atl: null,
  price_change_percentage_1h_in_currency: 0,
  price_change_percentage_24h_in_currency: 0,
  price_change_percentage_7d_in_currency: 0,
  price_change_percentage_30d_in_currency: 0,
  sparkline_in_7d: null,
  ...over,
});

const btc = coin({
  id: "bitcoin",
  symbol: "btc",
  price_change_percentage_24h_in_currency: 2,
  price_change_percentage_7d_in_currency: 5,
});

describe("metricValue (always relative to BTC)", () => {
  it("subtracts BTC's change for the window (excess return)", () => {
    const eth = coin({
      id: "ethereum",
      symbol: "eth",
      price_change_percentage_24h_in_currency: 8,
    });
    // 8% coin − 2% BTC = +6% over BTC
    expect(metricValue(eth, "24h", btc)).toBe(6);
  });

  it("is 0 for BTC measured against itself", () => {
    expect(metricValue(btc, "7d", btc)).toBe(0);
  });

  it("returns null when the coin's metric is missing", () => {
    const x = coin({
      id: "x",
      symbol: "x",
      price_change_percentage_30d_in_currency: null,
    });
    expect(metricValue(x, "30d", btc)).toBeNull();
  });

  it("returns null when BTC is absent (not yet loaded)", () => {
    const eth = coin({ id: "ethereum", symbol: "eth" });
    expect(metricValue(eth, "24h", undefined)).toBeNull();
  });
});

describe("applyFilters (relative to BTC)", () => {
  const coins = [
    coin({ id: "a", symbol: "a", price_change_percentage_24h_in_currency: 12 }),
    coin({ id: "b", symbol: "b", price_change_percentage_24h_in_currency: 3 }),
    coin({ id: "c", symbol: "c", price_change_percentage_24h_in_currency: -5 }),
  ];

  it("returns all coins when there are no conditions", () => {
    expect(applyFilters(coins, [], btc)).toHaveLength(3);
  });

  it("keeps only coins whose excess-over-BTC meets a single condition", () => {
    // BTC 24h = 2, so relative values are a:+10, b:+1, c:−7.
    const conds: FilterCondition[] = [
      { metric: "24h", operator: "gte", value: 10 },
    ];
    expect(applyFilters(coins, conds, btc).map((c) => c.id)).toEqual(["a"]);
  });

  it("AND-combines multiple conditions", () => {
    const rows = [
      coin({
        id: "hit",
        symbol: "h",
        price_change_percentage_24h_in_currency: 12,
        price_change_percentage_30d_in_currency: 25,
      }),
      coin({
        id: "miss",
        symbol: "m",
        price_change_percentage_24h_in_currency: 12,
        price_change_percentage_30d_in_currency: 5,
      }),
    ];
    // BTC 24h=2, 30d=0 → hit relative: 24h +10, 30d +25; miss: 24h +10, 30d +5.
    const conds: FilterCondition[] = [
      { metric: "24h", operator: "gte", value: 10 },
      { metric: "30d", operator: "gt", value: 20 },
    ];
    expect(applyFilters(rows, conds, btc).map((c) => c.id)).toEqual(["hit"]);
  });

  it("surfaces coins beating BTC (> 0 excess)", () => {
    const conds: FilterCondition[] = [
      { metric: "24h", operator: "gt", value: 0 },
    ];
    // a (12 > 2) and b (3 > 2) beat BTC; c (−5) lags.
    expect(applyFilters(coins, conds, btc).map((c) => c.id)).toEqual(["a", "b"]);
  });
});

describe("URL state encode/decode round-trip", () => {
  it("omits defaults, producing an empty query for the default state", () => {
    const state: RadarState = {
      conditions: [],
      sortKey: "rank",
      sortDir: "asc",
      q: "",
    };
    expect(encodeRadarState(state)).toBe("");
  });

  it("round-trips a non-default state (conditions, sort, search)", () => {
    const state: RadarState = {
      conditions: [
        { metric: "24h", operator: "gte", value: 10 },
        { metric: "7d", operator: "lt", value: -3 },
      ],
      sortKey: "7d",
      sortDir: "desc",
      q: "sol",
    };
    const decoded = decodeRadarState(new URLSearchParams(encodeRadarState(state)));
    expect(decoded).toEqual(state);
  });

  it("round-trips a rank sort with ascending and descending direction", () => {
    const asc: RadarState = {
      conditions: [],
      sortKey: "rank",
      sortDir: "asc",
      q: "",
    };
    // rank+asc is the default, so the query is empty but still decodes to it.
    expect(decodeRadarState(new URLSearchParams(encodeRadarState(asc)))).toEqual(
      asc,
    );

    const desc: RadarState = { ...asc, sortDir: "desc" };
    expect(decodeRadarState(new URLSearchParams(encodeRadarState(desc)))).toEqual(
      desc,
    );
  });

  it("drops malformed conditions and falls back to defaults", () => {
    const decoded = decodeRadarState(
      new URLSearchParams("f=24h:gte:10,bogus,7d:xx:5"),
    );
    expect(decoded.conditions).toEqual([
      { metric: "24h", operator: "gte", value: 10 },
    ]);
  });
});

describe("presets", () => {
  it("every preset decodes back to itself through the URL", () => {
    for (const preset of PRESETS) {
      const qs = encodeRadarState({
        conditions: preset.conditions,
        sortKey: "rank",
        sortDir: "asc",
        q: "",
      });
      const decoded = decodeRadarState(new URLSearchParams(qs));
      expect(decoded.conditions).toEqual(preset.conditions);
    }
  });
});

describe("conditionLabel", () => {
  it("renders metric, operator symbol, and signed percent", () => {
    expect(conditionLabel({ metric: "24h", operator: "gte", value: 10 })).toBe(
      "24h ≥ +10%",
    );
    expect(conditionLabel({ metric: "7d", operator: "lt", value: -3 })).toBe(
      "7d < -3%",
    );
  });
});

describe("tvSymbol", () => {
  it("maps a coin to BINANCE:<SYMBOL>USDT by default", () => {
    expect(tvSymbol({ id: "ethereum", symbol: "eth" })).toBe("BINANCE:ETHUSDT");
  });

  it("uses the override map for special-cased ids", () => {
    expect(tvSymbol({ id: "usd-coin", symbol: "usdc" })).toBe("BINANCE:USDCUSD");
  });
});
