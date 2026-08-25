import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every retired path, sent to what it means now. #46 retired /radar and
  // /heatmap with a bare 404 because the lens was local state back then, so a
  // redirect would have landed on the default lens and only pretended to honour
  // the link; #48 removed that premise, and lenses are URL-addressable now.
  //
  // /backtest was a 307 while its destination still carried the legacy /sleeve
  // name; that name is gone, so all four are permanent.
  redirects: async () => [
    { source: "/radar", destination: "/?lens=relative", permanent: true },
    { source: "/heatmap", destination: "/?lens=heatmap", permanent: true },
    { source: "/sleeve", destination: "/strategy", permanent: true },
    {
      source: "/backtest",
      destination: "/strategy?lens=backtest",
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
