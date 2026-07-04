import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import { TickerTape } from "@/components/ticker-tape";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: "HODL — Crypto Market Dashboard",
  description:
    "Live prices, market caps, and 7-day trends for the top 100 cryptocurrencies, powered by CoinGecko.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "HODL",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // Browser/PWA chrome color, per OS scheme (the default `system` theme). Each
  // mirrors a `--background` token as a literal hex — chrome can't read a CSS
  // variable. Light = oklch(1 0 0); dark = oklch(0.17 0.008 140). Keep both in
  // sync with `--background` in app/globals.css if those tokens change.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1c19" },
  ],
};

const RootLayout = ({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactNode => (
  <html lang="en" suppressHydrationWarning>
    <body
      className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
    >
      <Providers>
        <Header />
        <TickerTape />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </Providers>
    </body>
  </html>
);

export default RootLayout;
