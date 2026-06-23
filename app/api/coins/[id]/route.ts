import type { NextRequest } from "next/server";

import { cgFetch } from "@/lib/coingecko";
import { handleRoute } from "@/lib/route";
import type { CoinDetail } from "@/lib/types";

/** GET /api/coins/:id — detailed data for a single coin. */
export const GET = (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> =>
  handleRoute(async () => {
    const { id } = await params;
    const query = new URLSearchParams({
      localization: "false",
      tickers: "false",
      market_data: "true",
      community_data: "false",
      developer_data: "false",
      sparkline: "false",
    });
    return cgFetch<CoinDetail>(
      `/coins/${encodeURIComponent(id)}?${query.toString()}`,
      { revalidate: 120 },
    );
  });
