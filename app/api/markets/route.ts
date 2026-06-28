import type { NextRequest } from "next/server";

import { cgFetch } from "@/lib/coingecko";
import { handleRoute } from "@/lib/route";
import type { Coin } from "@/lib/types";

/** GET /api/markets?vs_currency=usd — top 100 coins by market cap. */
export const GET = (request: NextRequest): Promise<Response> =>
  handleRoute(() => {
    const currency = request.nextUrl.searchParams.get("vs_currency") ?? "usd";
    const params = new URLSearchParams({
      vs_currency: currency,
      order: "market_cap_desc",
      per_page: "100",
      page: "1",
      sparkline: "true",
      price_change_percentage: "1h,24h,7d,30d",
    });
    return cgFetch<Coin[]>(`/coins/markets?${params.toString()}`, {
      revalidate: 60,
    });
  });
