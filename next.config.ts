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
  // Framing is refused, and refused twice. `frame-ancestors` is the directive
  // that actually decides it in a current browser; `X-Frame-Options` is the
  // older header that browsers ignore once a CSP carries `frame-ancestors`, and
  // is here for the ones that do not, and for the scanners that only look for
  // it. Nothing else is asserted: a real CSP for scripts and styles is a
  // separate change with its own way of breaking the app quietly.
  //
  // This is the premise `lib/safe-redirect.ts` was waiting on. Now that no
  // third party can frame the app, an embedded navigation can only come from
  // this origin — but the gate still leaves `iframe` out, because returning a
  // user into a frame is a product decision, not a security one.
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        {
          key: "Content-Security-Policy",
          value: "frame-ancestors 'none'",
        },
        { key: "X-Frame-Options", value: "DENY" },
      ],
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
