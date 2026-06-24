"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";

import { TransactionForm } from "@/components/portfolio/transaction-form";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatPercent, percentColorClass } from "@/lib/format";
import {
  allocations,
  holdingValue,
  pnlPct,
  type PriceMap,
} from "@/lib/portfolio-core";
import type { Position } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PositionsTableProps {
  positions: Position[];
  prices: PriceMap;
}

/** Derived positions: net quantity, average cost, value, and P&L per coin. */
export const PositionsTable = ({
  positions,
  prices,
}: PositionsTableProps): React.ReactNode => {
  const allocByCoin = new Map(
    allocations(positions, prices).map((a) => [a.coinId, a.pct]),
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Coin</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead className="text-right">Avg Cost</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Value</TableHead>
          <TableHead className="text-right">Unrealized P&L</TableHead>
          <TableHead className="text-right">Realized</TableHead>
          <TableHead className="text-right">24h</TableHead>
          <TableHead className="text-right">Alloc</TableHead>
          <TableHead className="text-right">Trade</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {positions.map((p) => {
          const price = prices[p.coinId]?.usd ?? 0;
          const change24h = prices[p.coinId]?.usd_24h_change ?? null;
          const value = holdingValue(p.quantity, price);
          const unrealized = value - p.costBasis;
          const pct = pnlPct(value, p.costBasis);
          const avgCost = p.quantity > 0 ? p.costBasis / p.quantity : 0;

          return (
            <TableRow key={p.coinId}>
              <TableCell>
                <Link
                  href={`/coins/${p.coinId}`}
                  className="flex items-center gap-2 hover:underline"
                >
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt=""
                      width={20}
                      height={20}
                      className="rounded-full"
                    />
                  ) : null}
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs uppercase text-muted-foreground">
                    {p.symbol}
                  </span>
                </Link>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {p.quantity}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(avgCost, "usd")}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(price, "usd")}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(value, "usd")}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums",
                  percentColorClass(unrealized),
                )}
              >
                <div>{formatCurrency(unrealized, "usd")}</div>
                <div className="text-xs">{formatPercent(pct)}</div>
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums",
                  p.realized !== 0
                    ? percentColorClass(p.realized)
                    : "text-muted-foreground",
                )}
              >
                {p.realized !== 0 ? formatCurrency(p.realized, "usd") : "—"}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums",
                  percentColorClass(change24h),
                )}
              >
                {formatPercent(change24h)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {(allocByCoin.get(p.coinId) ?? 0).toFixed(1)}%
              </TableCell>
              <TableCell className="text-right">
                <TransactionForm
                  presetCoin={{
                    coinId: p.coinId,
                    symbol: p.symbol,
                    name: p.name,
                    image: p.image,
                  }}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Add a transaction for ${p.name}`}
                    >
                      <Plus className="size-4" />
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
