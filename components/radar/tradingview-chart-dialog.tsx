"use client";

import { useEffect, useRef } from "react";

import { useTheme } from "next-themes";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { tvSymbol } from "@/lib/radar";
import type { Coin } from "@/lib/types";

const SCRIPT_SRC =
  "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

/**
 * The TradingView Advanced Chart embed. It's a third-party iframe (the one place
 * HODL accepts another product's visual identity), so it lives inside a modal.
 * We inject the official script with a JSON config on mount and tear it down on
 * unmount; re-injects when the symbol or theme changes. No npm dependency, no
 * API key, and — crucially — no CoinGecko quota cost.
 */
const TradingViewWidget = ({ symbol }: { symbol: string }): React.ReactNode => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "light" ? "light" : "dark";

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      symbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme,
      style: "1",
      locale: "en",
      autosize: true,
      allow_symbol_change: false,
      hide_side_toolbar: false,
      studies: ["RSI@tv-basicstudies"],
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      // Clear the injected iframe + script so a reopen rebuilds cleanly.
      container.innerHTML = "";
    };
  }, [symbol, theme]);

  return (
    <div className="tradingview-widget-container size-full" ref={containerRef}>
      <div className="tradingview-widget-container__widget size-full" />
    </div>
  );
};

/**
 * Per-row chart modal. Controlled by the parent: a non-null `coin` opens it.
 * Keyed remount on symbol guarantees the widget rebuilds for each coin.
 */
export const TradingViewChartDialog = ({
  coin,
  onClose,
}: {
  coin: Coin | null;
  onClose: () => void;
}): React.ReactNode => {
  const open = coin !== null;
  const symbol = coin ? tvSymbol(coin) : "";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex h-[80vh] max-w-[calc(100%-2rem)] flex-col gap-3 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {coin ? `${coin.name} chart` : "Chart"}
            <span className="ml-2 text-xs font-normal uppercase text-muted-foreground">
              {coin?.symbol}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-hidden rounded-lg ring-1 ring-foreground/10">
          {open ? <TradingViewWidget key={symbol} symbol={symbol} /> : null}
        </div>
        <p className="text-center text-[0.7rem] text-muted-foreground">
          Chart by{" "}
          <a
            href={`https://www.tradingview.com/symbols/${symbol.replace(":", "-")}/`}
            target="_blank"
            rel="noreferrer"
            className="focus-ring rounded-xs underline underline-offset-2 hover:text-foreground"
          >
            TradingView
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
};
