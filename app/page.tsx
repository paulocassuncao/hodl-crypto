import { GainersLosers } from "@/components/gainers-losers";
import { MarketHero } from "@/components/market-hero";
import { MarketLens } from "@/components/market/market-lens";
import { NewsFeed } from "@/components/news-feed";
import { TrendingSection } from "@/components/trending-section";

/**
 * Market — the app's home. A living hero (total cap + global readings), the
 * highlights, and the top-100 list seen through three lenses (table, BTC-
 * relative, heatmap): the former Coins / Radar / Heatmap screens, unified.
 */
const MarketPage = (): React.ReactNode => (
  <div className="space-y-8">
    <h1 className="sr-only">Crypto Market</h1>
    <MarketHero />
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <TrendingSection />
      <GainersLosers />
      <NewsFeed className="lg:col-span-2" />
    </div>
    <MarketLens />
  </div>
);

export default MarketPage;
