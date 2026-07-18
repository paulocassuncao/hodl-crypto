"use client";

import { CoinIcon } from "@/components/coin-icon";
import Link from "next/link";
import { Flame } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrending } from "@/hooks/use-trending";
import { HIGHLIGHT_COUNT } from "@/lib/constants";
import { formatPercent, percentColorClass } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Card listing the currently trending coins. */
export const TrendingSection = (): React.ReactNode => {
  const { data, isLoading } = useTrending();
  const coins = data?.slice(0, HIGHLIGHT_COUNT) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Flame className="size-4 text-trending" />
          Trending
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
                className="focus-ring group flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent"
              >
                <span className="flex items-center gap-2">
                  <CoinIcon src={coin.thumb} size={20} />
                  <span className="text-sm font-medium">{coin.name}</span>
                  <span className="text-xs uppercase text-muted-foreground">
                    {coin.symbol}
                  </span>
                </span>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    percentColorClass(coin.price_change_24h),
                  )}
                >
                  {formatPercent(coin.price_change_24h)}
                </span>
              </Link>
            ))}
      </CardContent>
    </Card>
  );
};
