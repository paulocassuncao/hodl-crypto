import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Header } from "@/components/header";
import { Providers } from "@/components/providers";
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
  title: "HODL — Crypto Market Dashboard",
  description:
    "Live prices, market caps, and 7-day trends for the top 100 cryptocurrencies, powered by CoinGecko.",
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
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </Providers>
    </body>
  </html>
);

export default RootLayout;
