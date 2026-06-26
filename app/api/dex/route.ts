import type { NextRequest } from "next/server";

import { normalizePools, type GtPoolsResponse } from "@/lib/dex";
import { gtFetch } from "@/lib/geckoterminal";
import { handleRoute } from "@/lib/route";

/** GET /api/dex?network=eth&mode=trending — on-chain pools from GeckoTerminal. */
export const GET = (request: NextRequest): Promise<Response> =>
  handleRoute(async () => {
    const network = request.nextUrl.searchParams.get("network") ?? "eth";
    const mode =
      request.nextUrl.searchParams.get("mode") === "new"
        ? "new_pools"
        : "trending_pools";

    const res = await gtFetch<GtPoolsResponse>(
      `/networks/${encodeURIComponent(network)}/${mode}?include=base_token,quote_token,dex`,
      { revalidate: 60 },
    );
    return normalizePools(res, network);
  });
