import type { NextRequest } from "next/server";

import { fetchNews } from "@/lib/news";
import { handleRoute } from "@/lib/route";

/**
 * GET /api/news — aggregated crypto headlines from public RSS feeds.
 * Optional `symbol` + `name` query params filter to a single coin.
 */
export const GET = (req: NextRequest): Promise<Response> =>
  handleRoute(async () => {
    const { searchParams } = req.nextUrl;
    const symbol = searchParams.get("symbol") ?? undefined;
    const name = searchParams.get("name") ?? undefined;
    return fetchNews({ symbol, name });
  });
