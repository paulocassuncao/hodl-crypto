import type { MetadataRoute } from "next";

/** PWA manifest (served at /manifest.webmanifest) so HODL is installable. */
const manifest = (): MetadataRoute.Manifest => ({
  name: "HODL — Crypto Market Dashboard",
  short_name: "HODL",
  description:
    "A fast, free dashboard for the top 100 cryptocurrencies: prices, trends, portfolio, and alerts.",
  start_url: "/",
  display: "standalone",
  background_color: "#1a1c19",
  theme_color: "#1a1c19",
  categories: ["finance"],
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    {
      src: "/icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
});

export default manifest;
