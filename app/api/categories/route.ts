import { cgFetch } from "@/lib/coingecko";
import { handleRoute } from "@/lib/route";
import type { Category } from "@/lib/types";

interface CategoryResponse {
  id: string;
  name: string;
  market_cap: number | null;
  market_cap_change_24h: number | null;
  volume_24h: number | null;
  top_3_coins: string[];
}

/** GET /api/categories — market sectors ordered by market cap. */
export const GET = (): Promise<Response> =>
  handleRoute(async () => {
    const res = await cgFetch<CategoryResponse[]>("/coins/categories", {
      revalidate: 300,
    });
    return res.map(
      (c): Category => ({
        id: c.id,
        name: c.name,
        market_cap: c.market_cap,
        market_cap_change_24h: c.market_cap_change_24h,
        volume_24h: c.volume_24h,
        top_3_coins: c.top_3_coins ?? [],
      }),
    );
  });
