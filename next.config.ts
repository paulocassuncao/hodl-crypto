import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every retired path, sent to what it means now. #46 retired /radar and
  // /heatmap with a bare 404 because the lens was local state back then, so a
  // redirect would have landed on the default lens and only pretended to honour
  // the link; #48 removed that premise, and lenses are URL-addressable now.
  //
  // `permanent` tracks the DESTINATION, not the source. A 308 is cached by the
  // browser for good: once a client has followed it, there is no live request
  // left to correct, so it may only point somewhere that cannot move. `/` is
  // that; `/strategy` is only the current name for a screen whose shape has
  // changed three times — the last time being the rename that retired
  // `/sleeve`, which the previous version of this comment predicted and then
  // suffered. A 307 costs one round trip on a path almost nobody hits.
  redirects: async () => [
    { source: "/radar", destination: "/?lens=relative", permanent: true },
    { source: "/heatmap", destination: "/?lens=heatmap", permanent: true },
    { source: "/sleeve", destination: "/strategy", permanent: false },
    {
      source: "/backtest",
      destination: "/strategy?lens=backtest",
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
