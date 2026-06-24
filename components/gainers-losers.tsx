"use client";

import Image from "next/image";
import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarkets } from "@/hooks/use-markets";
import { HIGHLIGHT_COUNT } from "@/lib/constants";
import { useCurrency } from "@/lib/currency";
import {
  formatCurrency,
  formatPercent,
  percentColorClass,
} from "@/lib/format";
import type { Coin } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Top 5 gainers and losers by 24h change, derived from the markets data. */
export const GainersLosers = (): React.ReactNode => {
  const { data, isLoading } = useMarkets();
  const { currency } = useCurrency();

  const ranked = [...(data ?? [])]
    .filter((c) => c.price_change_percentage_24h_in_currency != null)
    .sort(
      (a, b) =>
        (b.price_change_percentage_24h_in_currency ?? 0) -
        (a.price_change_percentage_24h_in_currency ?? 0),
    );
  const gainers = ranked.slice(0, HIGHLIGHT_COUNT);
  const losers = ranked.slice(-HIGHLIGHT_COUNT).reverse();

  return (
    <>
      <MoversCard
        title="Top Gainers"
        icon={<TrendingUp className="size-4 text-[var(--gain)]" />}
        coins={gainers}
        currency={currency}
        isLoading={isLoading}
      />
      <MoversCard
        title="Top Losers"
        icon={<TrendingDown className="size-4 text-[var(--loss)]" />}
        coins={losers}
        currency={currency}
        isLoading={isLoading}
      />
    </>
  );
};

const MoversCard = ({
  title,
  icon,
  coins,
  currency,
  isLoading,
}: {
  title: string;
  icon: React.ReactNode;
  coins: Coin[];
  currency: ReturnType<typeof useCurrency>["currency"];
  isLoading: boolean;
}): React.ReactNode => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base">
        {icon}
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-1">
      {isLoading
        ? Array.from({ length: HIGHLIGHT_COUNT }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))
        : coins.map((coin) => (
            <Link
              key={coin.id}
              href={`/coins/${coin.id}`}
              className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent"
            >
              <span className="flex items-center gap-2">
                <Image
                  src={coin.image}
                  alt=""
                  width={20}
                  height={20}
                  className="rounded-full"
                />
                <span className="text-sm font-medium">{coin.symbol.toUpperCase()}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatCurrency(coin.current_price, currency)}
                </span>
                <span
                  className={cn(
                    "w-16 text-right text-xs tabular-nums",
                    percentColorClass(
                      coin.price_change_percentage_24h_in_currency,
                    ),
                  )}
                >
                  {formatPercent(coin.price_change_percentage_24h_in_currency)}
                </span>
              </span>
            </Link>
          ))}
    </CardContent>
  </Card>
);
