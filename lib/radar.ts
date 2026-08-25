/**
 * Radar screener: pure logic for the multi-timeframe filter engine.
 *
 * No React here — this is the testable core that powers the Radar page.
 * Radar is a *relative-strength* tool: every metric is measured against
 * Bitcoin (the coin's change minus BTC's for the same window), so the page
 * shows something the absolute Coins table can't. This module handles that
 * metric extraction, AND-combined filtering, presets, and URL (de)serialization.
 */

import type { Coin } from "@/lib/types";

/** The momentum windows Radar can rank, filter, and chart on. */
export type RadarMetric = "1h" | "24h" | "7d" | "30d";

/** Comparison applied to a metric value in a filter condition. */
export type RadarOperator = "gte" | "lte" | "gt" | "lt";

/** Sortable columns: any momentum window, or market-cap rank (the default). */
export type RadarSortKey = RadarMetric | "rank";

/** A single filter clause, e.g. `{ metric: "24h", operator: "gte", value: 10 }`. */
export interface FilterCondition {
  metric: RadarMetric;
  operator: RadarOperator;
  value: number;
}

/** Full screener state — the unit we sync to the URL. */
export interface RadarState {
  conditions: FilterCondition[];
  sortKey: RadarSortKey;
  sortDir: "asc" | "desc";
  /** Free-text filter on coin name/symbol. */
  q: string;
  /** Narrow to the coins the user starred. */
  watchlist: boolean;
}

export const METRICS: RadarMetric[] = ["1h", "24h", "7d", "30d"];

export const METRIC_LABEL: Record<RadarMetric, string> = {
  "1h": "1h",
  "24h": "24h",
  "7d": "7d",
  "30d": "30d",
};

export const OPERATORS: { value: RadarOperator; label: string; symbol: string }[] = [
  { value: "gte", label: "≥", symbol: "≥" },
  { value: "lte", label: "≤", symbol: "≤" },
  { value: "gt", label: ">", symbol: ">" },
  { value: "lt", label: "<", symbol: "<" },
];

const COIN_FIELD: Record<RadarMetric, keyof Coin> = {
  "1h": "price_change_percentage_1h_in_currency",
  "24h": "price_change_percentage_24h_in_currency",
  "7d": "price_change_percentage_7d_in_currency",
  "30d": "price_change_percentage_30d_in_currency",
};

/** Raw absolute % change for a window, or null if the feed omitted it. */
const rawChange = (coin: Coin, metric: RadarMetric): number | null => {
  const value = coin[COIN_FIELD[metric]];
  return typeof value === "number" ? value : null;
};

/**
 * The number Radar shows in a cell: the coin's change minus Bitcoin's change
 * for the same window — its excess return over BTC. Bitcoin itself reads 0.
 * Returns null when either side is missing (e.g. BTC not yet loaded).
 */
export const metricValue = (
  coin: Coin,
  metric: RadarMetric,
  btc: Coin | undefined,
): number | null => {
  const own = rawChange(coin, metric);
  if (own == null) return null;
  const base = btc ? rawChange(btc, metric) : null;
  if (base == null) return null;
  return own - base;
};

const passes = (value: number | null, condition: FilterCondition): boolean => {
  // A coin with no data for the metric can't satisfy a numeric threshold.
  if (value == null) return false;
  switch (condition.operator) {
    case "gte":
      return value >= condition.value;
    case "lte":
      return value <= condition.value;
    case "gt":
      return value > condition.value;
    case "lt":
      return value < condition.value;
  }
};

/** Keep only coins satisfying every condition (logical AND), all vs BTC. */
export const applyFilters = (
  coins: Coin[],
  conditions: FilterCondition[],
  btc: Coin | undefined,
): Coin[] => {
  if (conditions.length === 0) return coins;
  return coins.filter((coin) =>
    conditions.every((c) => passes(metricValue(coin, c.metric, btc), c)),
  );
};

/** One-tap starting points so the screener is useful without building a query. */
export interface RadarPreset {
  id: string;
  label: string;
  conditions: FilterCondition[];
}

export const PRESETS: RadarPreset[] = [
  {
    id: "beating-btc-24h",
    label: "Beating BTC 24h",
    conditions: [{ metric: "24h", operator: "gt", value: 0 }],
  },
  {
    id: "beating-btc-7d",
    label: "Beating BTC 7d",
    conditions: [{ metric: "7d", operator: "gt", value: 0 }],
  },
  {
    id: "lagging-btc",
    label: "Lagging BTC",
    conditions: [{ metric: "24h", operator: "lt", value: 0 }],
  },
];

export const DEFAULT_STATE: RadarState = {
  conditions: [],
  sortKey: "rank",
  sortDir: "asc",
  q: "",
  watchlist: false,
};

const isMetric = (v: string): v is RadarMetric =>
  (METRICS as string[]).includes(v);
const isSortKey = (v: string): v is RadarSortKey =>
  v === "rank" || isMetric(v);
const isOperator = (v: string): v is RadarOperator =>
  OPERATORS.some((o) => o.value === v);

/**
 * Serialize a condition as `metric:operator:value`, e.g. `24h:gte:10`.
 * Conditions join on `,`; the full state lives in `f`, `sort`, `dir`, and `q`.
 */
const encodeCondition = (c: FilterCondition): string =>
  `${c.metric}:${c.operator}:${c.value}`;

const decodeCondition = (raw: string): FilterCondition | null => {
  const [metric, operator, valueRaw] = raw.split(":");
  if (!isMetric(metric) || !isOperator(operator)) return null;
  const value = Number(valueRaw);
  if (!Number.isFinite(value)) return null;
  return { metric, operator, value };
};

/** State → query string (omitting defaults so clean views get clean URLs). */
export const encodeRadarState = (state: RadarState): string => {
  const params = new URLSearchParams();
  if (state.conditions.length > 0) {
    params.set("f", state.conditions.map(encodeCondition).join(","));
  }
  if (state.sortKey !== DEFAULT_STATE.sortKey) {
    params.set("sort", state.sortKey);
  }
  if (state.sortDir !== DEFAULT_STATE.sortDir) {
    params.set("dir", state.sortDir);
  }
  if (state.q.trim()) params.set("q", state.q.trim());
  if (state.watchlist) params.set("w", "1");
  return params.toString();
};

/** Query keys this module owns; everything else in the URL belongs to someone. */
const RADAR_KEYS = ["f", "sort", "dir", "q", "w"] as const;

/**
 * Drop the screener's keys from a query string. The Market screen calls this
 * when it leaves the relative lens: those params describe a view that is no
 * longer on screen, and leaving them behind both dirties the home address and
 * makes a shared link carry filters that silently do nothing.
 */
export const stripRadarState = (params: URLSearchParams): void => {
  for (const key of RADAR_KEYS) params.delete(key);
};

/**
 * Radar state written *into* an existing query string instead of replacing it.
 * The screener renders standalone and as the Market screen's "Relative to BTC"
 * lens, where the URL also carries `lens` — encoding from scratch would drop
 * it and bounce the user back to the table on the next sort.
 */
export const mergeRadarState = (
  current: URLSearchParams,
  state: RadarState,
): string => {
  const params = new URLSearchParams(current);
  for (const key of RADAR_KEYS) params.delete(key);
  const own = new URLSearchParams(encodeRadarState(state));
  for (const [key, value] of own) params.set(key, value);
  return params.toString();
};

/**
 * What to say when the screener shows nothing. Four dead ends reach the same
 * blank table and they are not interchangeable: telling someone to "adjust a
 * condition" when they have none, or blaming the top 100 when it was their own
 * search text, is worse than saying nothing. Ordered by cause, most specific
 * first. Pure so the branches can be tested without mounting the view.
 */
export const radarEmptyMessage = ({
  watchlist,
  watchedCount,
  starredCount,
  query,
}: {
  /** Is the view narrowed to starred coins? */
  watchlist: boolean;
  /** How many coins the user has starred, anywhere in the app. */
  watchedCount: number;
  /** How many of those are in this dataset, before the text search. */
  starredCount: number;
  query: string;
}): string => {
  if (watchlist && watchedCount === 0) {
    return "No coins in your watchlist yet — tap ☆ to add.";
  }
  // Stars can be set from a coin page, which reaches all of CoinGecko, so a
  // full watchlist can still have nothing in the top 100.
  if (watchlist && starredCount === 0) {
    return "None of your starred coins are in the top 100.";
  }
  const q = query.trim();
  if (q) return `No coins match “${q}”.`;
  return "No coins match these filters — adjust a condition or clear them.";
};

/** Query params → state, falling back to defaults for anything missing/invalid. */
export const decodeRadarState = (
  params: URLSearchParams | { get: (key: string) => string | null },
): RadarState => {
  const fRaw = params.get("f");
  const conditions = fRaw
    ? fRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(decodeCondition)
        .filter((c): c is FilterCondition => c !== null)
    : [];

  const sortRaw = params.get("sort");
  const sortKey: RadarSortKey =
    sortRaw && isSortKey(sortRaw) ? sortRaw : DEFAULT_STATE.sortKey;

  const dirRaw = params.get("dir");
  const sortDir: "asc" | "desc" = dirRaw === "desc" ? "desc" : "asc";

  const q = params.get("q") ?? "";
  const watchlist = params.get("w") === "1";

  return { conditions, sortKey, sortDir, q, watchlist };
};

/** Human label for a condition chip, e.g. `24h ≥ +10%`. */
export const conditionLabel = (c: FilterCondition): string => {
  const op = OPERATORS.find((o) => o.value === c.operator)?.symbol ?? c.operator;
  const sign = c.value > 0 ? "+" : "";
  return `${METRIC_LABEL[c.metric]} ${op} ${sign}${c.value}%`;
};

/**
 * Map a coin to a TradingView symbol, e.g. `BINANCE:ETHUSDT`. Most top-100
 * coins trade as `<SYMBOL>USDT` on Binance; a small override map covers tickers
 * that differ or that Binance doesn't list, so the chart modal resolves cleanly.
 */
const TV_OVERRIDES: Record<string, string> = {
  // CoinGecko id → fully-qualified TradingView symbol.
  "wrapped-bitcoin": "BINANCE:WBTCUSDT",
  "lido-staked-ether": "BINANCE:ETHUSDT",
  "wrapped-steth": "BINANCE:ETHUSDT",
  usdt: "BINANCE:USDTUSD",
  tether: "BINANCE:USDTUSD",
  "usd-coin": "BINANCE:USDCUSD",
};

export const tvSymbol = (coin: Pick<Coin, "id" | "symbol">): string => {
  const override = TV_OVERRIDES[coin.id];
  if (override) return override;
  return `BINANCE:${coin.symbol.toUpperCase()}USDT`;
};
