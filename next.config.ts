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
    // Temporary on purpose, unlike the two above. A 308 is cached by the
    // browser for good, and `/sleeve` is a legacy route name that already
    // disagrees with its own nav label and page title ("Strategy") — if it is
    // ever renamed, a cached 308 here would keep sending old links straight to
    // a path we no longer control, with no live request left to intercept.
    {
      source: "/backtest",
      destination: "/sleeve?lens=backtest",
      permanent: false,
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
