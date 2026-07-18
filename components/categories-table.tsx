"use client";

import { useMemo, useState } from "react";

import { CoinIcon } from "@/components/coin-icon";
import { ArrowDown, ArrowDownUp, ArrowUp, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCategories } from "@/hooks/use-categories";
import { useCurrency } from "@/lib/currency";
import { formatCompact, formatPercent, percentColorClass } from "@/lib/format";
import type { Category, Currency } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortKey = "market_cap" | "market_cap_change_24h" | "volume_24h";
type SortDir = "asc" | "desc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "market_cap", label: "Market Cap" },
  { key: "market_cap_change_24h", label: "24h %" },
  { key: "volume_24h", label: "24h Volume" },
];

/** Market sectors: a card list on mobile and a full table on md+. */
export const CategoriesTable = (): React.ReactNode => {
  const { currency } = useCurrency();
  const { data, isLoading } = useCategories();

  const [sortKey, setSortKey] = useState<SortKey>("market_cap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const rows = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const diff = (a[sortKey] ?? -Infinity) - (b[sortKey] ?? -Infinity);
      return sortDir === "asc" ? diff : -diff;
    });
  }, [data, sortKey, sortDir]);

  const toggleSort = (key: SortKey): void => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-3">
      {/* Mobile sort control (no clickable headers on cards). */}
      <div className="flex justify-end md:hidden">
        <MobileSort
          sortKey={sortKey}
          sortDir={sortDir}
          onSelect={toggleSort}
        />
      </div>

      {/* Mobile: stacked card list. */}
      <div className="space-y-2 md:hidden">
        {isLoading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))
        ) : (
          <ul className="divide-y rounded-lg border">
            {rows.map((cat) => (
              <CategoryCard key={cat.id} cat={cat} currency={currency} />
            ))}
          </ul>
        )}
      </div>

      {/* md+: full table. */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Category</TableHead>
              <SortHeader
                label="Market Cap"
                active={sortKey === "market_cap"}
                dir={sortDir}
                onClick={() => toggleSort("market_cap")}
              />
              <SortHeader
                label="24h"
                active={sortKey === "market_cap_change_24h"}
                dir={sortDir}
                onClick={() => toggleSort("market_cap_change_24h")}
              />
              <SortHeader
                label="24h Volume"
                active={sortKey === "volume_24h"}
                dir={sortDir}
                onClick={() => toggleSort("volume_24h")}
                className="hidden lg:table-cell"
              />
              <TableHead className="hidden text-right lg:table-cell">
                Top Coins
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 12 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : rows.map((cat) => (
                  <CategoryRow key={cat.id} cat={cat} currency={currency} />
                ))}
          </TableBody>
        </Table>
      </div>
    </div>
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
        render={<Button variant="outline" size="sm" className="gap-1" />}
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
  className,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}): React.ReactNode => (
  <TableHead className={className}>
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex w-full items-center justify-end gap-1 text-xs font-medium uppercase tracking-wide hover:text-foreground",
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

const CoinIcons = ({ srcs }: { srcs: string[] }): React.ReactNode => (
  <div className="flex shrink-0 -space-x-1.5">
    {srcs.slice(0, 3).map((src, i) => (
      <CoinIcon
        key={i}
        src={src}
        size={20}
        imageClassName="ring-2 ring-card"
      />
    ))}
  </div>
);

/** Compact row for the mobile card list. */
const CategoryCard = ({
  cat,
  currency,
}: {
  cat: Category;
  currency: Currency;
}): React.ReactNode => (
  <li className="flex items-center gap-3 px-3 py-2.5">
    <CoinIcons srcs={cat.top_3_coins} />
    <div className="min-w-0 flex-1">
      <div className="truncate font-medium">{cat.name}</div>
      <div className="text-xs text-muted-foreground">
        Vol {formatCompact(cat.volume_24h, currency)}
      </div>
    </div>
    <div className="shrink-0 text-right">
      <div className="font-medium tabular-nums">
        {formatCompact(cat.market_cap, currency)}
      </div>
      <div
        className={cn(
          "text-xs tabular-nums",
          percentColorClass(cat.market_cap_change_24h),
        )}
      >
        {formatPercent(cat.market_cap_change_24h)}
      </div>
    </div>
  </li>
);

const CategoryRow = ({
  cat,
  currency,
}: {
  cat: Category;
  currency: Currency;
}): React.ReactNode => (
  <TableRow>
    <TableCell className="font-medium">{cat.name}</TableCell>
    <TableCell className="text-right tabular-nums">
      {formatCompact(cat.market_cap, currency)}
    </TableCell>
    <TableCell
      className={cn(
        "text-right tabular-nums",
        percentColorClass(cat.market_cap_change_24h),
      )}
    >
      {formatPercent(cat.market_cap_change_24h)}
    </TableCell>
    <TableCell className="hidden text-right tabular-nums lg:table-cell">
      {formatCompact(cat.volume_24h, currency)}
    </TableCell>
    <TableCell className="hidden lg:table-cell">
      <div className="flex justify-end">
        <CoinIcons srcs={cat.top_3_coins} />
      </div>
    </TableCell>
  </TableRow>
);
