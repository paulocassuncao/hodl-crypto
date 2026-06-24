import { MarketHeatmap } from "@/components/heatmap/market-heatmap";

export const metadata = {
  title: "Heatmap · HODL",
  description: "Crypto market heatmap of the top 100 coins by market cap.",
};

export default function HeatmapPage(): React.ReactNode {
  return <MarketHeatmap />;
}
