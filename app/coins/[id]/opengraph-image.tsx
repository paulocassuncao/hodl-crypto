import { ImageResponse } from "next/og";

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
import type { CoinDetail } from "@/lib/types";

export const alt = "Coin price on HODL";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Dynamic social-preview image for a coin: logo, name, price, and 24h change. */
export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<ImageResponse> {
  const { id } = await params;

  let coin: CoinDetail | null = null;
  try {
    coin = await cgFetch<CoinDetail>(
      `/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
      { revalidate: 120 },
    );
  } catch {
    coin = null;
  }

  const name = coin?.name ?? "HODL";
  const symbol = coin?.symbol?.toUpperCase() ?? "";
  const price = coin ? formatCurrency(coin.market_data.current_price.usd, "usd") : "";
  const change = coin?.market_data.price_change_percentage_24h ?? null;

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
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {coin?.image?.large ? (
            <img
              src={coin.image.large}
              alt=""
              width={120}
              height={120}
              style={{ borderRadius: 9999 }}
            />
          ) : null}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 64, fontWeight: 700 }}>{name}</div>
            <div style={{ fontSize: 32, color: OG_MUTED }}>{symbol}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 28 }}>
          <div style={{ fontSize: 100, fontWeight: 700 }}>{price}</div>
          {change !== null ? (
            <div style={{ display: "flex", fontSize: 52, color: ogChangeColor(change) }}>
              {`${change >= 0 ? "▲" : "▼"} ${formatPercent(change)}`}
            </div>
          ) : null}
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
    { ...size },
  );
}
