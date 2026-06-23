import type { NextRequest } from "next/server";

import { cgFetch } from "@/lib/coingecko";
import { handleRoute } from "@/lib/route";
import type { ChartPoint } from "@/lib/types";

interface MarketChartResponse {
  prices: [number, number][];
}

/** GET /api/coins/:id/chart?days=7&vs_currency=usd — historical price series. */
export const GET = (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> =>
  handleRoute(async () => {
    const { id } = await params;
    const currency = request.nextUrl.searchParams.get("vs_currency") ?? "usd";
    const days = request.nextUrl.searchParams.get("days") ?? "7";
    const query = new URLSearchParams({ vs_currency: currency, days });

    const res = await cgFetch<MarketChartResponse>(
      `/coins/${encodeURIComponent(id)}/market_chart?${query.toString()}`,
      { revalidate: 60 },
    );
    return res.prices.map(([time, price]): ChartPoint => ({ time, price }));
  });
