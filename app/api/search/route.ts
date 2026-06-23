import type { NextRequest } from "next/server";

import { cgFetch } from "@/lib/coingecko";
import { handleRoute } from "@/lib/route";
import type { SearchCoin } from "@/lib/types";

interface SearchResponse {
  coins: {
    id: string;
    name: string;
    symbol: string;
    thumb: string;
    market_cap_rank: number | null;
  }[];
}

/** GET /api/search?query= — coin matches across all of CoinGecko. */
export const GET = (request: NextRequest): Promise<Response> =>
  handleRoute(async () => {
    const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
    if (query.length < 2) return [] as SearchCoin[];

    const res = await cgFetch<SearchResponse>(
      `/search?query=${encodeURIComponent(query)}`,
      { revalidate: 300 },
    );
    return res.coins.slice(0, 12).map(
      (c): SearchCoin => ({
        id: c.id,
        name: c.name,
        symbol: c.symbol,
        thumb: c.thumb,
        market_cap_rank: c.market_cap_rank,
      }),
    );
  });
