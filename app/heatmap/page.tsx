import dynamic from "next/dynamic";

// The heatmap IS this route's content, so keep it server-rendered (header +
// its own skeleton) but code-split the recharts treemap into its own chunk so
// it stays out of the route's entry bundle.
const MarketHeatmap = dynamic(() =>
  import("@/components/heatmap/market-heatmap").then((m) => m.MarketHeatmap),
);

export const metadata = {
  title: "Heatmap · HODL",
  description: "Crypto market heatmap of the top 100 coins by market cap.",
};

export default function HeatmapPage(): React.ReactNode {
  return <MarketHeatmap />;
}
