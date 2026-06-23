import { cgFetch } from "@/lib/coingecko";
import { handleRoute } from "@/lib/route";
import type { TrendingCoin } from "@/lib/types";

interface TrendingResponse {
  coins: {
    item: {
      id: string;
      name: string;
      symbol: string;
      thumb: string;
      market_cap_rank: number | null;
      data?: { price_change_percentage_24h?: { usd?: number } };
    };
  }[];
}

/** GET /api/trending — currently trending coins, normalized. */
export const GET = (): Promise<Response> =>
  handleRoute(async () => {
    const res = await cgFetch<TrendingResponse>("/search/trending", {
      revalidate: 120,
    });
    return res.coins.map(({ item }): TrendingCoin => ({
      id: item.id,
      name: item.name,
      symbol: item.symbol,
      thumb: item.thumb,
      market_cap_rank: item.market_cap_rank,
      price_change_24h: item.data?.price_change_percentage_24h?.usd ?? null,
    }));
  });
