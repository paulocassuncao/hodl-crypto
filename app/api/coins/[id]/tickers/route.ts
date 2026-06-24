import type { NextRequest } from "next/server";

import { cgFetch } from "@/lib/coingecko";
import { handleRoute } from "@/lib/route";
import type { Ticker } from "@/lib/types";

interface CgTicker {
  base: string;
  target: string;
  market: { name: string; identifier: string };
  last: number | null;
  converted_last: { usd?: number } | null;
  converted_volume: { usd?: number } | null;
  trust_score: string | null;
  trade_url: string | null;
}

interface CgTickersResponse {
  tickers: CgTicker[];
}

/** GET /api/coins/:id/tickers — top markets (exchanges) trading the coin. */
export const GET = (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> =>
  handleRoute(async () => {
    const { id } = await params;
    const query = new URLSearchParams({
      include_exchange_logo: "false",
      depth: "false",
      order: "volume_desc",
    });

    const res = await cgFetch<CgTickersResponse>(
      `/coins/${encodeURIComponent(id)}/tickers?${query.toString()}`,
      { revalidate: 120 },
    );

    return (res.tickers ?? [])
      .map(
        (t): Ticker => ({
          exchange: t.market.name,
          base: t.base,
          target: t.target,
          price: t.converted_last?.usd ?? t.last ?? null,
          volume: t.converted_volume?.usd ?? null,
          trustScore: t.trust_score,
          tradeUrl: t.trade_url,
        }),
      )
      .slice(0, 50);
  });
