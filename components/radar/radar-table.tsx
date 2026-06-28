"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown, LineChart } from "lucide-react";

import { Sparkline } from "@/components/market-table/sparkline";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WatchlistStar } from "@/components/watchlist-star";
import { formatCurrency, formatPercent, percentColorClass } from "@/lib/format";
import {
  METRICS,
  METRIC_LABEL,
  metricValue,
  type RadarMetric,
  type RadarSortKey,
} from "@/lib/radar";
import type { Coin, Currency } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RadarTableProps {
  rows: Coin[];
  btc: Coin | undefined;
  currency: Currency;
  sortKey: RadarSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: RadarSortKey) => void;
  onOpenChart: (coin: Coin) => void;
  isLoading: boolean;
}

/**
 * The Radar momentum grid. Mirrors the signature Market Table (dual-mode,
 * mono tabular cells, sign+arrow color, sortable headers) but every %-cell
 * is performance *relative to Bitcoin* (via `metricValue`), so Bitcoin reads 0
 * and the rest of the table reads as out/under-performance.
 */
export const RadarTable = ({
  rows,
  btc,
  currency,
  sortKey,
  sortDir,
  onSort,
  onOpenChart,
  isLoading,
}: RadarTableProps): React.ReactNode => {
  const isEmpty = !isLoading && rows.length === 0;

  return (
    <section className="space-y-3">
      {/* Mobile: stacked card list. */}
      <div className="space-y-2 md:hidden">
        {isLoading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))
        ) : isEmpty ? (
          <EmptyState />
        ) : (
          <ul className="divide-y rounded-lg border">
            {rows.map((coin) => (
              <RadarCard
                key={coin.id}
                coin={coin}
                btc={btc}
                currency={currency}
                onOpenChart={onOpenChart}
              />
            ))}
          </ul>
        )}
      </div>

      {/* md+: full data table. */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8" aria-label="Watchlist" />
              <SortHeader
                label="#"
                align="left"
                active={sortKey === "rank"}
                dir={sortDir}
                onClick={() => onSort("rank")}
                className="w-12"
              />
              <TableHead>Coin</TableHead>
              <TableHead className="text-right">Price</TableHead>
              {METRICS.map((m) => (
                <SortHeader
                  key={m}
                  label={METRIC_LABEL[m]}
                  active={sortKey === m}
                  dir={sortDir}
                  onClick={() => onSort(m)}
                />
              ))}
              <TableHead className="hidden text-right lg:table-cell">
                Last 7 Days
              </TableHead>
              <TableHead className="w-8" aria-label="Chart" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 15 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={10}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : rows.map((coin) => (
                  <RadarRow
                    key={coin.id}
                    coin={coin}
                    btc={btc}
                    currency={currency}
                    onOpenChart={onOpenChart}
                  />
                ))}
            {isEmpty ? (
              <TableRow>
                <TableCell colSpan={10} className="p-0">
                  <EmptyState />
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
  );
};

const EmptyState = (): React.ReactNode => (
  <p className="rounded-lg py-10 text-center text-sm text-muted-foreground">
    No coins match these filters — adjust a condition or clear them.
  </p>
);

const SortHeader = ({
  label,
  active,
  dir,
  onClick,
  align = "right",
  className,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "left" | "right";
  className?: string;
}): React.ReactNode => (
  <TableHead className={className}>
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex w-full items-center gap-1 text-xs font-medium uppercase tracking-wide hover:text-foreground",
        align === "right" ? "justify-end" : "justify-start",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : (
        <ChevronsUpDown className="size-3 opacity-40" />
      )}
    </button>
  </TableHead>
);

/** A single momentum cell: value pulled through metricValue, color + sign. */
const MetricCell = ({
  coin,
  btc,
  metric,
  className,
}: {
  coin: Coin;
  btc: Coin | undefined;
  metric: RadarMetric;
  className?: string;
}): React.ReactNode => {
  const value = metricValue(coin, metric, btc);
  return (
    <TableCell
      className={cn(
        "text-right font-mono tabular-nums",
        percentColorClass(value),
        className,
      )}
    >
      {formatPercent(value)}
    </TableCell>
  );
};

const RadarRow = ({
  coin,
  btc,
  currency,
  onOpenChart,
}: {
  coin: Coin;
  btc: Coin | undefined;
  currency: Currency;
  onOpenChart: (coin: Coin) => void;
}): React.ReactNode => (
  <TableRow className="group">
    <TableCell className="pr-0">
      <WatchlistStar id={coin.id} />
    </TableCell>
    <TableCell className="font-mono text-muted-foreground tabular-nums">
      {coin.market_cap_rank}
    </TableCell>
    <TableCell>
      <Link
        href={`/coins/${coin.id}`}
        className="flex items-center gap-2 font-medium group-hover:underline"
      >
        <Image
          src={coin.image}
          alt=""
          width={24}
          height={24}
          className="rounded-full"
        />
        <span>{coin.name}</span>
        <span className="text-xs uppercase text-muted-foreground">
          {coin.symbol}
        </span>
      </Link>
    </TableCell>
    <TableCell className="text-right font-mono tabular-nums">
      {formatCurrency(coin.current_price, currency)}
    </TableCell>
    {METRICS.map((m) => (
      <MetricCell key={m} coin={coin} btc={btc} metric={m} />
    ))}
    <TableCell className="hidden lg:table-cell">
      <div className="flex justify-end">
        <Sparkline prices={coin.sparkline_in_7d?.price ?? []} />
      </div>
    </TableCell>
    <TableCell className="pl-0 text-right">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Open ${coin.name} chart`}
        onClick={() => onOpenChart(coin)}
      >
        <LineChart className="size-4" />
      </Button>
    </TableCell>
  </TableRow>
);

const RadarCard = ({
  coin,
  btc,
  currency,
  onOpenChart,
}: {
  coin: Coin;
  btc: Coin | undefined;
  currency: Currency;
  onOpenChart: (coin: Coin) => void;
}): React.ReactNode => (
  <li className="space-y-2 px-3 py-2.5">
    <div className="flex items-center gap-3">
      <WatchlistStar id={coin.id} className="shrink-0" />
      <Link
        href={`/coins/${coin.id}`}
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        <Image
          src={coin.image}
          alt=""
          width={28}
          height={28}
          className="shrink-0 rounded-full"
        />
        <span className="min-w-0">
          <span className="block truncate font-medium">{coin.name}</span>
          <span className="text-xs uppercase text-muted-foreground">
            {coin.symbol}
            {coin.market_cap_rank ? ` · #${coin.market_cap_rank}` : ""}
          </span>
        </span>
      </Link>
      <span className="shrink-0 text-right font-mono tabular-nums">
        {formatCurrency(coin.current_price, currency)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        aria-label={`Open ${coin.name} chart`}
        onClick={() => onOpenChart(coin)}
      >
        <LineChart className="size-4" />
      </Button>
    </div>
    <div className="grid grid-cols-4 gap-1 text-center">
      {METRICS.map((m) => {
        const value = metricValue(coin, m, btc);
        return (
          <div key={m} className="rounded-md bg-muted/40 py-1">
            <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              {METRIC_LABEL[m]}
            </div>
            <div
              className={cn(
                "font-mono text-xs tabular-nums",
                percentColorClass(value),
              )}
            >
              {formatPercent(value)}
            </div>
          </div>
        );
      })}
    </div>
  </li>
);
