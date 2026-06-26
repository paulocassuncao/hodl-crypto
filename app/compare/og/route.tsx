import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { cgFetch } from "@/lib/coingecko";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  OG_BG,
  OG_BRAND,
  OG_FG,
  OG_MUTED,
  OG_SIZE,
  ogChangeColor,
} from "@/lib/og";
import type { Coin } from "@/lib/types";

/**
 * GET /compare/og?ids=bitcoin,ethereum — dynamic OG image for a comparison.
 * A route handler (not the opengraph-image convention) because the selected
 * coins live in the query string, which opengraph-image files don't receive.
 */
export const GET = async (request: NextRequest): Promise<Response> => {
  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  let coins: Coin[] = [];
  try {
    if (ids.length > 0) {
      coins = await cgFetch<Coin[]>(
        `/coins/markets?vs_currency=usd&ids=${encodeURIComponent(ids.join(","))}&sparkline=false&price_change_percentage=24h`,
        { revalidate: 120 },
      );
    }
  } catch {
    coins = [];
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: OG_BG,
          color: OG_FG,
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 48, fontWeight: 700, color: OG_MUTED }}>
          Compare
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {coins.map((c) => (
            <div
              key={c.id}
              style={{ display: "flex", alignItems: "center", gap: 24 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.image}
                alt=""
                width={64}
                height={64}
                style={{ borderRadius: 9999 }}
              />
              <div style={{ fontSize: 44, fontWeight: 700, width: 360 }}>
                {c.name}
              </div>
              <div style={{ fontSize: 40, width: 280 }}>
                {formatCurrency(c.current_price, "usd")}
              </div>
              <div
                style={{
                  fontSize: 40,
                  color: ogChangeColor(
                    c.price_change_percentage_24h_in_currency,
                  ),
                }}
              >
                {formatPercent(c.price_change_percentage_24h_in_currency)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: OG_BRAND }}>
            HODL
          </div>
          <div style={{ fontSize: 28, color: OG_MUTED }}>
            · Crypto Market Dashboard
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
};
