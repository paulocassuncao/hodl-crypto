"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";

import { CoinIcon } from "@/components/coin-icon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  ChevronsUpDown,
  Download,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { AlertButton } from "@/components/alerts/alert-button";
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
import { download } from "@/lib/download";
import { marketsToCsv } from "@/lib/markets-csv";
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

/** Stable empty fallback for coins missing sparkline data — a fresh `[]` literal
 *  at the call site would give `Sparkline` a new prop identity every render and
 *  defeat its memo. */
const EMPTY_PRICES: number[] = [];

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
  const router = useRouter();
  const { currency } = useCurrency();
  const { ids: watchedIds } = useWatchlist();
  const { data, isLoading, isError, error } = useMarkets();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "watchlist">("all");
  const [sortKey, setSortKey] = useState<SortKey>("market_cap_rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const filterRef = useRef<HTMLInputElement>(null);
  const tableWrapRef = useRef<HTMLDivElement>(null);

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

  // Re-sorting/filtering changes which row sits at an index, so drop the cursor.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFocusedIndex(-1);
  }, [sortKey, sortDir, filter, query]);

  // Move keyboard focus onto the active row whenever the cursor changes.
  useEffect(() => {
    if (focusedIndex < 0) return;
    const el = tableWrapRef.current?.querySelector<HTMLElement>(
      `[data-row-index="${focusedIndex}"]`,
    );
    el?.focus();
    el?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex]);

  /** vim-style keyboard navigation for the desktop table. */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    const tag = (e.target as HTMLElement).tagName;
    const typing = tag === "INPUT" || tag === "TEXTAREA";
    if (e.key === "/" && !typing) {
      e.preventDefault();
      filterRef.current?.focus();
      return;
    }
    if (typing || rows.length === 0) return;
    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(rows.length - 1, i + 1));
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => (i <= 0 ? 0 : i - 1));
    } else if (e.key === "Enter" && focusedIndex >= 0 && rows[focusedIndex]) {
      router.push(`/coins/${rows[focusedIndex].id}`);
    }
  };

  const handleExportCsv = (): void => {
    download(
      `hodl-markets-${currency}.csv`,
      marketsToCsv(rows, currency),
      "text/csv;charset=utf-8",
    );
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
          <h2 className="font-display text-lg font-semibold">
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
              ref={filterRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter the top 100…  ( / )"
              className="pl-8"
              aria-label="Filter the top 100 coins by name or symbol"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1"
            onClick={handleExportCsv}
            disabled={rows.length === 0}
            title="Export the current view as CSV"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
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

      {/* md+: full data table. Focus it, then use j/k (or ↑/↓) and Enter. */}
      <div
        ref={tableWrapRef}
        tabIndex={0}
        // A labeled, focusable scroll region — not role="grid": the native
        // <table> inside already exposes table semantics, and we implement
        // row-level j/k nav, not the cell-level arrow model grid would promise.
        role="group"
        aria-label="Top 100 coins. Press j and k to navigate rows, Enter to open, slash to filter."
        onKeyDown={handleKeyDown}
        className="hidden overflow-x-auto rounded-lg border outline-none focus-visible:ring-2 focus-visible:ring-ring md:block"
      >
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
              <TableHead className="w-8" aria-label="Alert" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 15 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={11}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : rows.map((coin, i) => (
                  <CoinRow
                    key={coin.id}
                    coin={coin}
                    currency={currency}
                    index={i}
                    sortKey={sortKey}
                    onFocus={setFocusedIndex}
                  />
                ))}
            {isEmpty ? (
              <TableRow>
                <TableCell
                  colSpan={11}
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
  // The active/sorted column carries a faint neutral wash (header + cells) so the
  // eye anchors on the timeframe in focus without muting the others' gain/loss
  // color — every % column keeps its market-direction signal.
  <TableHead className={cn(className, active && "bg-foreground/[0.04]")}>
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // min-h-6 clears the WCAG 2.2 2.5.8 (24px) target floor on mouse; coarse
        // pointers (touch laptops/tablets that still get the md+ table) expand to
        // the 44px tap target used across the rest of the app.
        "inline-flex min-h-6 items-center gap-1 text-xs font-medium uppercase tracking-wide hover:text-foreground pointer-coarse:min-h-11",
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

/** Compact tappable row for the mobile card list. Memoized: filter typing
 *  re-runs the parent but leaves each card's props (coin, currency) unchanged. */
const CoinCard = memo(({
  coin,
  currency,
}: {
  coin: Coin;
  currency: Currency;
}): React.ReactNode => (
  <li className="market-row group relative flex items-center gap-3 rounded-lg px-3 py-2.5">
    <WatchlistStar id={coin.id} className="relative z-10 shrink-0" />
    {/* Overlay link makes the whole card tappable without nesting in the star
        button. The ring is inset (-offset) so keyboard focus is visible without
        being clipped at the card edge; the label carries price + 24h move so a
        screen reader announces the row's data, not just the coin name. */}
    <Link
      href={`/coins/${coin.id}`}
      className="absolute inset-0 rounded-lg outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      aria-label={`${coin.name}, ${formatCurrency(coin.current_price, currency)}, ${formatPercent(coin.price_change_percentage_24h_in_currency)} 24h`}
    />
    <CoinIcon src={coin.image} size={28} />
    <div className="min-w-0 flex-1">
      <div className="truncate font-medium">{coin.name}</div>
      <div className="text-xs uppercase text-muted-foreground">
        {coin.symbol}
        {coin.market_cap_rank ? ` · #${coin.market_cap_rank}` : ""}
      </div>
    </div>
    <Sparkline
      prices={coin.sparkline_in_7d?.price ?? EMPTY_PRICES}
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
    <span className="relative z-10 shrink-0">
      <AlertButton
        compact
        coinId={coin.id}
        symbol={coin.symbol}
        name={coin.name}
        image={coin.image}
        currentPrice={coin.current_price}
      />
    </span>
  </li>
));
CoinCard.displayName = "CoinCard";

/** Desktop data-table row. Memoized with a stable `onFocus` (the raw state
 *  setter) so a filter keystroke doesn't reconcile all ~100 rows and sparklines. */
const CoinRow = memo(({
  coin,
  currency,
  index,
  sortKey,
  onFocus,
}: {
  coin: Coin;
  currency: Currency;
  index: number;
  sortKey: SortKey;
  onFocus: (index: number) => void;
}): React.ReactNode => {
  // Faint neutral wash on the active/sorted column's cells (matches the sorted
  // header), so the timeframe in focus reads as a column without stripping the
  // gain/loss color from the others.
  const activeCol = (key: SortKey): string | false =>
    key === sortKey && "bg-foreground/[0.04]";
  return (
    <TableRow
      className="market-row group outline-none focus:bg-muted/50"
      data-row-index={index}
      tabIndex={-1}
      onFocus={() => onFocus(index)}
    >
      <TableCell className="pr-0">
        <WatchlistStar id={coin.id} />
      </TableCell>
      <TableCell
        className={cn(
          "text-muted-foreground tabular-nums",
          activeCol("market_cap_rank"),
        )}
      >
        {coin.market_cap_rank}
      </TableCell>
      <TableCell>
        <Link
          href={`/coins/${coin.id}`}
          className="flex items-center gap-2 font-medium group-hover:underline"
        >
          <CoinIcon src={coin.image} size={24} />
          <span>{coin.name}</span>
          <span className="text-xs uppercase text-muted-foreground">
            {coin.symbol}
          </span>
        </Link>
      </TableCell>
      <TableCell
        className={cn("text-right tabular-nums", activeCol("current_price"))}
      >
        {formatCurrency(coin.current_price, currency)}
      </TableCell>
      <TableCell
        className={cn(
          "hidden text-right tabular-nums lg:table-cell",
          percentColorClass(coin.price_change_percentage_1h_in_currency),
          activeCol("price_change_percentage_1h_in_currency"),
        )}
      >
        {formatPercent(coin.price_change_percentage_1h_in_currency)}
      </TableCell>
      <TableCell
        className={cn(
          "text-right tabular-nums",
          percentColorClass(coin.price_change_percentage_24h_in_currency),
          activeCol("price_change_percentage_24h_in_currency"),
        )}
      >
        {formatPercent(coin.price_change_percentage_24h_in_currency)}
      </TableCell>
      <TableCell
        className={cn(
          "hidden text-right tabular-nums lg:table-cell",
          percentColorClass(coin.price_change_percentage_7d_in_currency),
          activeCol("price_change_percentage_7d_in_currency"),
        )}
      >
        {formatPercent(coin.price_change_percentage_7d_in_currency)}
      </TableCell>
      <TableCell
        className={cn(
          "hidden text-right tabular-nums lg:table-cell",
          activeCol("total_volume"),
        )}
      >
        {formatCompact(coin.total_volume, currency)}
      </TableCell>
      <TableCell
        className={cn("text-right tabular-nums", activeCol("market_cap"))}
      >
        {formatCompact(coin.market_cap, currency)}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <div className="flex justify-end">
          <Sparkline prices={coin.sparkline_in_7d?.price ?? EMPTY_PRICES} />
        </div>
      </TableCell>
      <TableCell className="pl-0 text-right">
        <AlertButton
          compact
          coinId={coin.id}
          symbol={coin.symbol}
          name={coin.name}
          image={coin.image}
          currentPrice={coin.current_price}
        />
      </TableCell>
    </TableRow>
  );
});
CoinRow.displayName = "CoinRow";
