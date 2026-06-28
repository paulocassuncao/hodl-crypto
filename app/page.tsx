import { FearGreedGauge } from "@/components/fear-greed-gauge.lazy";
import { GainersLosers } from "@/components/gainers-losers";
import { GlobalStatsBar } from "@/components/global-stats-bar";
import { MarketTable } from "@/components/market-table/market-table";
import { NewsFeed } from "@/components/news-feed";
import { TrendingSection } from "@/components/trending-section";

/** Dashboard home: global stats, highlights, and the top 100 table. */
const HomePage = (): React.ReactNode => (
  <div className="space-y-8">
    <h1 className="sr-only">Crypto Market Dashboard</h1>
    <GlobalStatsBar />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <FearGreedGauge />
      <TrendingSection />
      <GainersLosers />
      <NewsFeed className="sm:col-span-2 xl:col-span-4" />
    </div>
    <MarketTable />
  </div>
);

export default HomePage;
