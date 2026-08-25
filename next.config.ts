import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Backtest was its own nav entry until it became a lens of Strategy. Unlike
  // the /radar and /heatmap routes retired earlier, this one was linked and is
  // plausibly bookmarked, and the lens is URL-addressable — so the redirect
  // lands on the view the old link actually meant.
  redirects: async () => [
    {
      source: "/backtest",
      destination: "/sleeve?view=backtest",
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
