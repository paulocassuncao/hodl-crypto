import type { Metadata } from "next";

import { CoinDetailView } from "@/components/coin-detail/coin-detail-view";
import { cgFetch } from "@/lib/coingecko";
import { formatCurrency } from "@/lib/format";
import type { CoinDetail } from "@/lib/types";

/** Dynamic title/description per coin; the OG image is wired via opengraph-image. */
export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> => {
  const { id } = await params;
  try {
    const coin = await cgFetch<CoinDetail>(
      `/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
      { revalidate: 120 },
    );
    const price = formatCurrency(coin.market_data.current_price.usd, "usd");
    const title = `${coin.name} ${price} · HODL`;
    const description = `${coin.name} (${coin.symbol.toUpperCase()}) live price, chart, and key stats on HODL.`;
    return { title, description, openGraph: { title, description } };
  } catch {
    return { title: "Coin · HODL" };
  }
};

/** Per-coin detail route. Unwraps the async param and renders the client view. */
const CoinPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactNode> => {
  const { id } = await params;
  return <CoinDetailView id={id} />;
};

export default CoinPage;
