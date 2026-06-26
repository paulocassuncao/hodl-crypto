"use client";

import Image from "next/image";
import { TrendingDown, TrendingUp } from "lucide-react";

import { formatCurrency, formatPercent, percentColorClass } from "@/lib/format";
import {
  bestWorstPerformers,
  type PerformerStat,
  type PriceMap,
} from "@/lib/portfolio-core";
import type { Position } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AnalyticsSectionProps {
  positions: Position[];
  prices: PriceMap;
}

const PerformerCard = ({
  label,
  icon,
  stat,
}: {
  label: string;
  icon: React.ReactNode;
  stat: PerformerStat;
}): React.ReactNode => (
  <div className="rounded-lg border bg-card p-4">
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className="mt-2 flex items-center gap-2">
      {stat.image ? (
        <Image
          src={stat.image}
          alt=""
          width={24}
          height={24}
          className="rounded-full"
        />
      ) : null}
      <span className="font-medium">{stat.name}</span>
      <span className="text-xs uppercase text-muted-foreground">
        {stat.symbol}
      </span>
      <span
        className={cn(
          "ml-auto text-lg font-semibold tabular-nums",
          percentColorClass(stat.pnlPct),
        )}
      >
        {formatPercent(stat.pnlPct)}
      </span>
    </div>
    <div className="mt-1 text-right text-xs tabular-nums text-muted-foreground">
      {formatCurrency(stat.value, "usd")}
    </div>
  </div>
);

/** Best- and worst-performing open positions by unrealized P&L %. */
export const AnalyticsSection = ({
  positions,
  prices,
}: AnalyticsSectionProps): React.ReactNode => {
  const { best, worst } = bestWorstPerformers(positions, prices);
  // Nothing meaningful to compare with fewer than two priced positions.
  if (!best || !worst || best.coinId === worst.coinId) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <PerformerCard
        label="Best performer"
        icon={<TrendingUp className="size-3.5 text-gain" />}
        stat={best}
      />
      <PerformerCard
        label="Worst performer"
        icon={<TrendingDown className="size-3.5 text-loss" />}
        stat={worst}
      />
    </div>
  );
};
