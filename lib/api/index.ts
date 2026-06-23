import type {
  Category,
  ChartPoint,
  Coin,
  CoinDetail,
  Currency,
  FearGreed,
  GlobalData,
  SearchCoin,
  TrendingCoin,
} from "@/lib/types";

/** Throw with the server-provided message when a proxy route fails. */
const toJson = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
};

export const fetchMarkets = async (currency: Currency): Promise<Coin[]> =>
  toJson(await fetch(`/api/markets?vs_currency=${currency}`));

export const fetchGlobal = async (): Promise<GlobalData> =>
  toJson(await fetch("/api/global"));

export const fetchTrending = async (): Promise<TrendingCoin[]> =>
  toJson(await fetch("/api/trending"));

export const fetchCoin = async (id: string): Promise<CoinDetail> =>
  toJson(await fetch(`/api/coins/${id}`));

export const fetchCoinChart = async (
  id: string,
  days: number,
  currency: Currency,
): Promise<ChartPoint[]> =>
  toJson(await fetch(`/api/coins/${id}/chart?days=${days}&vs_currency=${currency}`));

export const fetchFearGreed = async (): Promise<FearGreed> =>
  toJson(await fetch("/api/fear-greed"));

export const searchCoins = async (query: string): Promise<SearchCoin[]> =>
  toJson(await fetch(`/api/search?query=${encodeURIComponent(query)}`));

export const fetchCategories = async (): Promise<Category[]> =>
  toJson(await fetch("/api/categories"));
