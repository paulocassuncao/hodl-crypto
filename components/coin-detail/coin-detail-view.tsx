"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CoinChart } from "@/components/coin-detail/coin-chart";
import { CoinStats } from "@/components/coin-detail/coin-stats";
import { WatchlistStar } from "@/components/watchlist-star";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCoin } from "@/hooks/use-coin";
import { useCurrency } from "@/lib/currency";
import {
  formatCurrency,
  formatPercent,
  percentColorClass,
} from "@/lib/format";
import { cn } from "@/lib/utils";

/** Strip HTML tags from CoinGecko descriptions for safe plain-text rendering. */
const toPlainText = (html: string): string =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Full coin detail view: header, price chart, stats, and description. */
export const CoinDetailView = ({ id }: { id: string }): React.ReactNode => {
  const { currency } = useCurrency();
  const { data: coin, isLoading, isError, error } = useCoin(id);

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      {isError ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load coin."}
        </div>
      ) : isLoading || !coin ? (
        <Skeleton className="h-20 w-full max-w-md" />
      ) : (
        <>
          <header className="flex flex-wrap items-center gap-4">
            <Image
              src={coin.image.large}
              alt=""
              width={48}
              height={48}
              className="rounded-full"
              unoptimized
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{coin.name}</h1>
                <span className="text-sm uppercase text-muted-foreground">
                  {coin.symbol}
                </span>
                {coin.market_cap_rank ? (
                  <Badge variant="secondary">Rank #{coin.market_cap_rank}</Badge>
                ) : null}
                <WatchlistStar id={id} className="ml-1" />
              </div>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-3xl font-semibold tabular-nums">
                  {formatCurrency(
                    coin.market_data.current_price[currency],
                    currency,
                  )}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium tabular-nums",
                    percentColorClass(
                      coin.market_data.price_change_percentage_24h,
                    ),
                  )}
                >
                  {formatPercent(coin.market_data.price_change_percentage_24h)}{" "}
                  (24h)
                </span>
              </div>
            </div>
          </header>

          <CoinChart id={id} />
          <CoinStats coin={coin} currency={currency} />

          {coin.description.en ? (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">About {coin.name}</h2>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {toPlainText(coin.description.en).slice(0, 600)}
                {toPlainText(coin.description.en).length > 600 ? "…" : ""}
              </p>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
};
