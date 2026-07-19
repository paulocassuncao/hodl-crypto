"use client";

import { CoinIcon } from "@/components/coin-icon";
import { TrendingDown, TrendingUp } from "lucide-react";

import { useMoney } from "@/hooks/use-money";
import { formatPercent, percentColorClass } from "@/lib/format";
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
  note,
}: {
  label: string;
  icon: React.ReactNode;
  stat: PerformerStat;
  /** Small clarifier, e.g. "still below cost" when the best holding is negative. */
  note?: string;
}): React.ReactNode => {
  const money = useMoney();
  return (
  <div className="rounded-lg glass-panel p-4">
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {icon}
      {label}
      {note ? <span className="text-muted-foreground/70">· {note}</span> : null}
    </div>
    <div className="mt-2 flex items-center gap-2">
      {stat.image ? (
        <CoinIcon src={stat.image} size={24} />
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
      {money.format(stat.value)}
    </div>
  </div>
  );
};

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
        note={best.pnlPct < 0 ? "still below cost" : undefined}
      />
      <PerformerCard
        label="Worst performer"
        icon={<TrendingDown className="size-3.5 text-loss" />}
        stat={worst}
      />
    </div>
  );
};
