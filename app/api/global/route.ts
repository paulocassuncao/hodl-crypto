import { cgFetch } from "@/lib/coingecko";
import { handleRoute } from "@/lib/route";
import type { GlobalData } from "@/lib/types";

/** GET /api/global — global market stats (unwrapped from CoinGecko's `data`). */
export const GET = (): Promise<Response> =>
  handleRoute(async () => {
    const res = await cgFetch<{ data: GlobalData }>("/global", {
      revalidate: 120,
    });
    return res.data;
  });
