import { Suspense } from "react";

import { GainersLosers } from "@/components/gainers-losers";
import { MarketHero } from "@/components/market-hero";
import { MarketLens } from "@/components/market/market-lens";
import { NewsFeed } from "@/components/news-feed";
import { TrendingSection } from "@/components/trending-section";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Market — the app's home. A living hero (total cap + global readings), the
 * highlights, and the top-100 list seen through three lenses (table, BTC-
 * relative, heatmap): the former Coins / Radar / Heatmap screens, unified.
 */
const MarketPage = (): React.ReactNode => (
  <div className="space-y-4">
    <h1 className="sr-only">Crypto Market</h1>
    <MarketHero />
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <TrendingSection />
      <GainersLosers />
      <NewsFeed className="lg:col-span-3" />
    </div>
    {/* MarketLens reads the active lens from the URL, so it renders under
        Suspense (the rest of the page prerenders as before). */}
    <Suspense
      fallback={<Skeleton className="min-h-[70vh] w-full rounded-lg" />}
    >
      <MarketLens />
    </Suspense>
  </div>
);

export default MarketPage;
