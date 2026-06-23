import { GainersLosers } from "@/components/gainers-losers";
import { GlobalStatsBar } from "@/components/global-stats-bar";
import { MarketTable } from "@/components/market-table/market-table";
import { TrendingSection } from "@/components/trending-section";

/** Dashboard home: global stats, highlights, and the top 100 table. */
const HomePage = (): React.ReactNode => (
  <div className="space-y-8">
    <GlobalStatsBar />
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <TrendingSection />
      <GainersLosers />
    </div>
    <MarketTable />
  </div>
);

export default HomePage;
