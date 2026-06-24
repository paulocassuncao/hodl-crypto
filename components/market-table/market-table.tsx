"use client";

import { useEffect, useMemo, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  ChevronsUpDown,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { Sparkline } from "@/components/market-table/sparkline";
import { WatchlistStar } from "@/components/watchlist-star";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMarkets } from "@/hooks/use-markets";
import { useCurrency } from "@/lib/currency";
import { useWatchlist } from "@/lib/watchlist";
import {
  formatCompact,
  formatCurrency,
  formatPercent,
  percentColorClass,
} from "@/lib/format";
import type { Coin, Currency } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortKey =
  | "market_cap_rank"
  | "current_price"
  | "price_change_percentage_1h_in_currency"
  | "price_change_percentage_24h_in_currency"
  | "price_change_percentage_7d_in_currency"
  | "total_volume"
  | "market_cap";

type SortDir = "asc" | "desc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "market_cap_rank", label: "Rank" },
  { key: "market_cap", label: "Market Cap" },
  { key: "current_price", label: "Price" },
  { key: "price_change_percentage_24h_in_currency", label: "24h %" },
  { key: "price_change_percentage_7d_in_currency", label: "7d %" },
  { key: "total_volume", label: "24h Volume" },
];

const sortValue = (coin: Coin, key: SortKey): number => {
  const value = coin[key];
  return typeof value === "number" ? value : Number.NEGATIVE_INFINITY;
};

/** Top 100 markets: a card list on mobile and a full table on md+. */
export const MarketTable = (): React.ReactNode => {
  const { currency } = useCurrency();
  const { ids: watchedIds } = useWatchlist();
  const { data, isLoading, isError, error } = useMarkets();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "watchlist">("all");
  const [sortKey, setSortKey] = useState<SortKey>("market_cap_rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    if (isError) {
      toast.error("Failed to load market data", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }, [isError, error]);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const filtered = data.filter((c) => {
      if (filter === "watchlist" && !watchedIds.has(c.id)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
      );
    });
    const sorted = [...filtered].sort((a, b) => {
      const diff = sortValue(a, sortKey) - sortValue(b, sortKey);
      return sortDir === "asc" ? diff : -diff;
    });
    return sorted;
  }, [data, query, filter, watchedIds, sortKey, sortDir]);

  const toggleSort = (key: SortKey): void => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Percent/price/volume default to high-to-low; rank defaults to low-to-high.
      setSortDir(key === "market_cap_rank" ? "asc" : "desc");
    }
  };

  const emptyMessage =
    filter === "watchlist" && !query
      ? "No coins in your watchlist yet — tap ☆ to add."
      : `No coins match “${query}”.`;
  const isEmpty = !isLoading && rows.length === 0;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">
            {filter === "watchlist" ? "Your Watchlist" : "Top 100 by Market Cap"}
          </h2>
          <Tabs
            value={filter}
            onValueChange={(v) => setFilter(v as "all" | "watchlist")}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="watchlist">
                ★ Watchlist
                {watchedIds.size > 0 ? ` (${watchedIds.size})` : ""}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter the top 100…"
              className="pl-8"
              aria-label="Filter the top 100 coins by name or symbol"
            />
          </div>
          <MobileSort
            sortKey={sortKey}
            sortDir={sortDir}
            onSelect={toggleSort}
          />
        </div>
      </div>

      {/* Mobile: stacked card list (no horizontal scroll). */}
      <div className="space-y-2 md:hidden">
        {isLoading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))
        ) : isEmpty ? (
          <p className="rounded-lg border py-10 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {rows.map((coin) => (
              <CoinCard key={coin.id} coin={coin} currency={currency} />
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
                active={sortKey === "market_cap_rank"}
                dir={sortDir}
                onClick={() => toggleSort("market_cap_rank")}
                className="w-12"
              />
              <TableHead>Coin</TableHead>
              <SortHeader
                label="Price"
                align="right"
                active={sortKey === "current_price"}
                dir={sortDir}
                onClick={() => toggleSort("current_price")}
              />
              <SortHeader
                label="1h"
                align="right"
                active={sortKey === "price_change_percentage_1h_in_currency"}
                dir={sortDir}
                onClick={() =>
                  toggleSort("price_change_percentage_1h_in_currency")
                }
                className="hidden lg:table-cell"
              />
              <SortHeader
                label="24h"
                align="right"
                active={sortKey === "price_change_percentage_24h_in_currency"}
                dir={sortDir}
                onClick={() =>
                  toggleSort("price_change_percentage_24h_in_currency")
                }
              />
              <SortHeader
                label="7d"
                align="right"
                active={sortKey === "price_change_percentage_7d_in_currency"}
                dir={sortDir}
                onClick={() =>
                  toggleSort("price_change_percentage_7d_in_currency")
                }
                className="hidden lg:table-cell"
              />
              <SortHeader
                label="24h Volume"
                align="right"
                active={sortKey === "total_volume"}
                dir={sortDir}
                onClick={() => toggleSort("total_volume")}
                className="hidden lg:table-cell"
              />
              <SortHeader
                label="Market Cap"
                align="right"
                active={sortKey === "market_cap"}
                dir={sortDir}
                onClick={() => toggleSort("market_cap")}
              />
              <TableHead className="hidden text-right lg:table-cell">
                Last 7 Days
              </TableHead>
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
                  <CoinRow key={coin.id} coin={coin} currency={currency} />
                ))}
            {isEmpty ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="py-10 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
  );
};

const MobileSort = ({
  sortKey,
  sortDir,
  onSelect,
}: {
  sortKey: SortKey;
  sortDir: SortDir;
  onSelect: (key: SortKey) => void;
}): React.ReactNode => {
  const active = SORT_OPTIONS.find((o) => o.key === sortKey);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="shrink-0 gap-1 md:hidden" />
        }
      >
        <ArrowDownUp className="size-4" />
        <span>{active?.label ?? "Sort"}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SORT_OPTIONS.map((o) => (
          <DropdownMenuItem
            key={o.key}
            onClick={() => onSelect(o.key)}
            className={cn(
              "justify-between gap-6",
              o.key === sortKey && "font-semibold",
            )}
          >
            {o.label}
            {o.key === sortKey ? (
              sortDir === "asc" ? (
                <ArrowUp className="size-3.5" />
              ) : (
                <ArrowDown className="size-3.5" />
              )
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const SortHeader = ({
  label,
  active,
  dir,
  onClick,
  align = "left",
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
  className?: string;
}): React.ReactNode => (
  <TableHead className={className}>
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide hover:text-foreground",
        active ? "text-foreground" : "text-muted-foreground",
        align === "right" && "w-full justify-end",
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

/** Compact tappable row for the mobile card list. */
const CoinCard = ({
  coin,
  currency,
}: {
  coin: Coin;
  currency: Currency;
}): React.ReactNode => (
  <li className="relative flex items-center gap-3 px-3 py-2.5">
    <WatchlistStar id={coin.id} className="relative z-10 shrink-0" />
    {/* Overlay link makes the whole card tappable without nesting in the star button. */}
    <Link
      href={`/coins/${coin.id}`}
      className="absolute inset-0"
      aria-label={coin.name}
    />
    <Image
      src={coin.image}
      alt=""
      width={28}
      height={28}
      className="shrink-0 rounded-full"
    />
    <div className="min-w-0 flex-1">
      <div className="truncate font-medium">{coin.name}</div>
      <div className="text-xs uppercase text-muted-foreground">
        {coin.symbol}
        {coin.market_cap_rank ? ` · #${coin.market_cap_rank}` : ""}
      </div>
    </div>
    <Sparkline
      prices={coin.sparkline_in_7d?.price ?? []}
      width={56}
      height={28}
    />
    <div className="shrink-0 text-right">
      <div className="font-medium tabular-nums">
        {formatCurrency(coin.current_price, currency)}
      </div>
      <div
        className={cn(
          "text-xs tabular-nums",
          percentColorClass(coin.price_change_percentage_24h_in_currency),
        )}
      >
        {formatPercent(coin.price_change_percentage_24h_in_currency)}
      </div>
    </div>
  </li>
);

const CoinRow = ({
  coin,
  currency,
}: {
  coin: Coin;
  currency: Currency;
}): React.ReactNode => (
  <TableRow className="group">
    <TableCell className="pr-0">
      <WatchlistStar id={coin.id} />
    </TableCell>
    <TableCell className="text-muted-foreground tabular-nums">
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
    <TableCell className="text-right tabular-nums">
      {formatCurrency(coin.current_price, currency)}
    </TableCell>
    <TableCell
      className={cn(
        "hidden text-right tabular-nums lg:table-cell",
        percentColorClass(coin.price_change_percentage_1h_in_currency),
      )}
    >
      {formatPercent(coin.price_change_percentage_1h_in_currency)}
    </TableCell>
    <TableCell
      className={cn(
        "text-right tabular-nums",
        percentColorClass(coin.price_change_percentage_24h_in_currency),
      )}
    >
      {formatPercent(coin.price_change_percentage_24h_in_currency)}
    </TableCell>
    <TableCell
      className={cn(
        "hidden text-right tabular-nums lg:table-cell",
        percentColorClass(coin.price_change_percentage_7d_in_currency),
      )}
    >
      {formatPercent(coin.price_change_percentage_7d_in_currency)}
    </TableCell>
    <TableCell className="hidden text-right tabular-nums lg:table-cell">
      {formatCompact(coin.total_volume, currency)}
    </TableCell>
    <TableCell className="text-right tabular-nums">
      {formatCompact(coin.market_cap, currency)}
    </TableCell>
    <TableCell className="hidden lg:table-cell">
      <div className="flex justify-end">
        <Sparkline prices={coin.sparkline_in_7d?.price ?? []} />
      </div>
    </TableCell>
  </TableRow>
);
