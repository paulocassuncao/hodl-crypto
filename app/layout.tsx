import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";

import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
import { Space } from "@/components/space";
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

// Display face for headings and hero numbers — a grotesque with genuine
// character (contrast, expressive terminals), well clear of the overused
// Inter/Geist/Space-Grotesk set. Numbers stay in Geist Mono (tabular).
const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
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
  // variable. Light = oklch(0.972 0.012 265); dark = oklch(0.15 0.022 265).
  // Keep both in sync with `--background` in app/globals.css if those change.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f3fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0e1a" },
  ],
};

const RootLayout = ({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactNode => (
  <html lang="en" suppressHydrationWarning>
    <body
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} min-h-screen antialiased`}
    >
      <Providers>
        {/* The living space — a fixed, render-isolated backdrop behind all content. */}
        <Space />
        <div className="relative z-10">
          <Header />
          <TickerTape />
          <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        </div>
      </Providers>
    </body>
  </html>
);

export default RootLayout;
