import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every screen that became a lens of another screen. #46 retired /radar and
  // /heatmap with a bare 404 because the lens was local state back then, so a
  // redirect would have landed on the default lens and only pretended to honour
  // the link. #48 removed that premise — lenses are URL-addressable now — so
  // all three send the old link to the view it actually meant.
  redirects: async () => [
    { source: "/radar", destination: "/?lens=relative", permanent: true },
    { source: "/heatmap", destination: "/?lens=heatmap", permanent: true },
    {
      source: "/backtest",
      destination: "/sleeve?lens=backtest",
      permanent: true,
    },
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "coin-images.coingecko.com" },
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "*.coingecko.com" },
    ],
  },
};

export default nextConfig;
