import type { NextRequest } from "next/server";

import { cgFetch } from "@/lib/coingecko";
import { handleRoute } from "@/lib/route";

type PriceMap = Record<string, Record<string, number>>;

/**
 * GET /api/prices?ids=bitcoin,ethereum&vs_currency=usd,eur
 * Batched spot prices for several coins/currencies in a single upstream call.
 */
export const GET = (request: NextRequest): Promise<Response> =>
  handleRoute(async () => {
    const { searchParams } = request.nextUrl;
    const ids = searchParams.get("ids")?.trim();
    const currencies = searchParams.get("vs_currency")?.trim() || "usd";

    if (!ids) return {} as PriceMap;

    const query = new URLSearchParams({
      ids,
      vs_currencies: currencies,
    });

    return cgFetch<PriceMap>(`/simple/price?${query.toString()}`, {
      revalidate: 60,
    });
  });
