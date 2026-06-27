"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDerivatives } from "@/hooks/use-derivatives";
import { useMoney, type Money } from "@/hooks/use-money";
import { formatPercent, percentColorClass } from "@/lib/format";
import type { Derivative } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortKey =
  | "openInterestUsd"
  | "volume24hUsd"
  | "fundingRatePct"
  | "price";

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "price", label: "Price" },
  { key: "fundingRatePct", label: "Funding" },
  { key: "openInterestUsd", label: "Open Interest" },
  {
    key: "volume24hUsd",
    label: "24h Volume",
    className: "hidden sm:table-cell",
  },
];

/** Derivatives (perps) page: funding rates and open interest, sortable. */
export const DerivativesView = (): React.ReactNode => {
  const { data, isLoading, isError, error } = useDerivatives();
  const [sortKey, setSortKey] = useState<SortKey>("openInterestUsd");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const money = useMoney();

  const rows = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const diff = (a[sortKey] ?? 0) - (b[sortKey] ?? 0);
      return sortDir === "asc" ? diff : -diff;
    });
  }, [data, sortKey, sortDir]);

  const toggleSort = (key: SortKey): void => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Derivatives</h1>
        <p className="text-sm text-muted-foreground">
          Top perpetual & futures markets by open interest, with funding rates.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Market</TableHead>
              {COLUMNS.map((c) => (
                <TableHead key={c.key} className={cn("text-right", c.className)}>
                  <button
                    type="button"
                    onClick={() => toggleSort(c.key)}
                    className={cn(
                      "inline-flex w-full items-center justify-end gap-1 text-xs font-medium uppercase tracking-wide hover:text-foreground",
                      sortKey === c.key ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {c.label}
                    {sortKey === c.key ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )
                    ) : (
                      <ChevronsUpDown className="size-3 opacity-40" />
                    )}
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isError ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  {error instanceof Error
                    ? error.message
                    : "Failed to load derivatives."}
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              Array.from({ length: 15 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              rows.map((d, i) => (
                <DerivativeRow
                  key={`${d.market}-${d.symbol}-${i}`}
                  d={d}
                  money={money}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
};

const DerivativeRow = ({
  d,
  money,
}: {
  d: Derivative;
  money: Money;
}): React.ReactNode => (
  <TableRow>
    <TableCell>
      <div className="font-medium">{d.symbol}</div>
      <div className="text-xs text-muted-foreground">
        {d.market}
        {d.contractType ? ` · ${d.contractType}` : ""}
      </div>
    </TableCell>
    <TableCell className="text-right tabular-nums">
      {money.format(d.price)}
    </TableCell>
    <TableCell
      className={cn(
        "text-right tabular-nums",
        percentColorClass(d.fundingRatePct),
      )}
    >
      {d.fundingRatePct === null ? "—" : formatPercent(d.fundingRatePct)}
    </TableCell>
    <TableCell className="text-right tabular-nums">
      {money.formatCompact(d.openInterestUsd)}
    </TableCell>
    <TableCell className="hidden text-right tabular-nums sm:table-cell">
      {money.formatCompact(d.volume24hUsd)}
    </TableCell>
  </TableRow>
);
