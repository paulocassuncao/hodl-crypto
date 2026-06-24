/** Shared domain types for the CoinGecko-backed market data. */

export type Currency = "usd" | "eur" | "gbp" | "jpy" | "btc" | "eth";

/** A row from `/coins/markets`. */
export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number | null;
  low_24h: number | null;
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  ath: number | null;
  atl: number | null;
  price_change_percentage_1h_in_currency: number | null;
  price_change_percentage_24h_in_currency: number | null;
  price_change_percentage_7d_in_currency: number | null;
  sparkline_in_7d: { price: number[] } | null;
}

/** Normalized global market stats from `/global`. */
export interface GlobalData {
  total_market_cap: Record<string, number>;
  total_volume: Record<string, number>;
  market_cap_percentage: Record<string, number>;
  active_cryptocurrencies: number;
  markets: number;
  market_cap_change_percentage_24h_usd: number;
}

/** Normalized trending coin from `/search/trending`. */
export interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  market_cap_rank: number | null;
  price_change_24h: number | null;
}

/** Subset of `/coins/{id}` we render on the detail page. */
export interface CoinDetail {
  id: string;
  symbol: string;
  name: string;
  image: { large: string };
  market_cap_rank: number | null;
  description: { en: string };
  links: { homepage: string[] };
  categories: string[];
  market_data: {
    current_price: Record<string, number>;
    market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    high_24h: Record<string, number>;
    low_24h: Record<string, number>;
    ath: Record<string, number>;
    atl: Record<string, number>;
    price_change_percentage_24h: number | null;
    circulating_supply: number | null;
    total_supply: number | null;
    max_supply: number | null;
  };
}

/** A single point on a price chart. */
export interface ChartPoint {
  time: number;
  price: number;
}

/** Crypto Fear & Greed index reading (alternative.me). */
export interface FearGreed {
  value: number;
  classification: string;
  timestamp: number;
}

/** A coin match from `/search`. */
export interface SearchCoin {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
  market_cap_rank: number | null;
}

/** A market sector from `/coins/categories`. */
export interface Category {
  id: string;
  name: string;
  market_cap: number | null;
  market_cap_change_24h: number | null;
  volume_24h: number | null;
  top_3_coins: string[];
}

export type AlertDirection = "above" | "below";

/** A user-defined browser price alert, persisted in localStorage. */
export interface PriceAlert {
  id: string;
  coinId: string;
  symbol: string;
  name: string;
  image: string;
  direction: AlertDirection;
  target: number;
  currency: Currency;
  createdAt: number;
  /** Epoch ms when the threshold was crossed, or null while still active. */
  triggeredAt: number | null;
}

/** A single market (exchange listing) trading a coin, from `/coins/:id/tickers`. */
export interface Ticker {
  exchange: string;
  base: string;
  target: string;
  /** Last price converted to USD. */
  price: number | null;
  /** 24h volume converted to USD. */
  volume: number | null;
  /** CoinGecko trust score: "green" | "yellow" | "red" | null. */
  trustScore: string | null;
  tradeUrl: string | null;
}
