"use client";

import { useEffect, useMemo, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";
import { toast } from "sonner";

import { Sparkline } from "@/components/market-table/sparkline";
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
import { useMarkets } from "@/hooks/use-markets";
import { useCurrency } from "@/lib/currency";
import {
  formatCompact,
  formatCurrency,
  formatPercent,
  percentColorClass,
} from "@/lib/format";
import type { Coin } from "@/lib/types";
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

const sortValue = (coin: Coin, key: SortKey): number => {
  const value = coin[key];
  return typeof value === "number" ? value : Number.NEGATIVE_INFINITY;
};

/** Top 100 table: searchable, sortable, with 7-day sparklines and row links. */
export const MarketTable = (): React.ReactNode => {
  const { currency } = useCurrency();
  const { data, isLoading, isError, error } = useMarkets();

  const [query, setQuery] = useState("");
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
    const filtered = q
      ? data.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.symbol.toLowerCase().includes(q),
        )
      : data;
    const sorted = [...filtered].sort((a, b) => {
      const diff = sortValue(a, sortKey) - sortValue(b, sortKey);
      return sortDir === "asc" ? diff : -diff;
    });
    return sorted;
  }, [data, query, sortKey, sortDir]);

  const toggleSort = (key: SortKey): void => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Percent/price/volume default to high-to-low; rank defaults to low-to-high.
      setSortDir(key === "market_cap_rank" ? "asc" : "desc");
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Top 100 by Market Cap</h2>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or symbol…"
            className="pl-8"
            aria-label="Search coins"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
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
                className="hidden sm:table-cell"
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
                className="hidden sm:table-cell"
              />
              <SortHeader
                label="24h Volume"
                align="right"
                active={sortKey === "total_volume"}
                dir={sortDir}
                onClick={() => toggleSort("total_volume")}
                className="hidden md:table-cell"
              />
              <SortHeader
                label="Market Cap"
                align="right"
                active={sortKey === "market_cap"}
                dir={sortDir}
                onClick={() => toggleSort("market_cap")}
                className="hidden md:table-cell"
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
                    <TableCell colSpan={9}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : rows.map((coin) => (
                  <CoinRow key={coin.id} coin={coin} currency={currency} />
                ))}
            {!isLoading && rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-10 text-center text-muted-foreground"
                >
                  No coins match “{query}”.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
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

const CoinRow = ({
  coin,
  currency,
}: {
  coin: Coin;
  currency: ReturnType<typeof useCurrency>["currency"];
}): React.ReactNode => (
  <TableRow className="group">
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
          unoptimized
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
        "hidden text-right tabular-nums sm:table-cell",
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
        "hidden text-right tabular-nums sm:table-cell",
        percentColorClass(coin.price_change_percentage_7d_in_currency),
      )}
    >
      {formatPercent(coin.price_change_percentage_7d_in_currency)}
    </TableCell>
    <TableCell className="hidden text-right tabular-nums md:table-cell">
      {formatCompact(coin.total_volume, currency)}
    </TableCell>
    <TableCell className="hidden text-right tabular-nums md:table-cell">
      {formatCompact(coin.market_cap, currency)}
    </TableCell>
    <TableCell className="hidden lg:table-cell">
      <div className="flex justify-end">
        <Sparkline prices={coin.sparkline_in_7d?.price ?? []} />
      </div>
    </TableCell>
  </TableRow>
);
