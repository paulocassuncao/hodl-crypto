import type { NextRequest } from "next/server";

import { cgFetch } from "@/lib/coingecko";
import { handleRoute } from "@/lib/route";
import type { OHLCPoint } from "@/lib/types";

/** CoinGecko returns `[time, open, high, low, close]` tuples. */
type OHLCResponse = [number, number, number, number, number][];

/** GET /api/coins/:id/ohlc?days=7&vs_currency=usd — OHLC candle series. */
export const GET = (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> =>
  handleRoute(async () => {
    const { id } = await params;
    const currency = request.nextUrl.searchParams.get("vs_currency") ?? "usd";
    const days = request.nextUrl.searchParams.get("days") ?? "7";
    const query = new URLSearchParams({ vs_currency: currency, days });

    const res = await cgFetch<OHLCResponse>(
      `/coins/${encodeURIComponent(id)}/ohlc?${query.toString()}`,
      { revalidate: 60 },
    );
    return res.map(
      ([time, open, high, low, close]): OHLCPoint => ({
        time,
        open,
        high,
        low,
        close,
      }),
    );
  });
