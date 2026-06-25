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
import {
  formatCurrency,
  formatPercent,
  formatQuantity,
  percentColorClass,
} from "@/lib/format";
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

/** Per-coin figures derived once, shared by the desktop row and mobile card. */
interface DerivedPosition {
  price: number;
  change24h: number | null;
  value: number;
  unrealized: number;
  pct: number;
  avgCost: number;
  alloc: number;
}

const derivePosition = (
  p: Position,
  prices: PriceMap,
  alloc: number,
): DerivedPosition => {
  const price = prices[p.coinId]?.usd ?? 0;
  const value = holdingValue(p.quantity, price);
  return {
    price,
    change24h: prices[p.coinId]?.usd_24h_change ?? null,
    value,
    unrealized: value - p.costBasis,
    pct: pnlPct(value, p.costBasis),
    avgCost: p.quantity > 0 ? p.costBasis / p.quantity : 0,
    alloc,
  };
};

/** Derived positions: net quantity, average cost, value, and P&L per coin. */
export const PositionsTable = ({
  positions,
  prices,
}: PositionsTableProps): React.ReactNode => {
  const allocByCoin = new Map(
    allocations(positions, prices).map((a) => [a.coinId, a.pct]),
  );

  return (
    <>
      {/* Mobile: stacked cards (no 10-column horizontal scroll on phones). */}
      <ul className="space-y-2 md:hidden">
        {positions.map((p) => (
          <PositionCard
            key={p.coinId}
            position={p}
            derived={derivePosition(p, prices, allocByCoin.get(p.coinId) ?? 0)}
          />
        ))}
      </ul>

      {/* md+: full data table. */}
      <div className="hidden md:block">
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
          const { price, change24h, value, unrealized, pct, avgCost } =
            derivePosition(p, prices, allocByCoin.get(p.coinId) ?? 0);

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
                {formatQuantity(p.quantity)}
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
      </div>
    </>
  );
};

/** Compact, glanceable position card for the mobile list. */
const PositionCard = ({
  position: p,
  derived,
}: {
  position: Position;
  derived: DerivedPosition;
}): React.ReactNode => {
  const { price, change24h, value, unrealized, pct, avgCost, alloc } = derived;

  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <Link
          href={`/coins/${p.coinId}`}
          className="flex min-w-0 items-center gap-2 hover:underline"
        >
          {p.image ? (
            <Image
              src={p.image}
              alt=""
              width={24}
              height={24}
              className="shrink-0 rounded-full"
            />
          ) : null}
          <span className="truncate font-medium">{p.name}</span>
          <span className="shrink-0 text-xs uppercase text-muted-foreground">
            {p.symbol}
          </span>
        </Link>
        <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
          {alloc.toFixed(1)}%
        </span>
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
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Value</div>
          <div className="text-lg font-semibold tabular-nums">
            {formatCurrency(value, "usd")}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Unrealized P&L</div>
          <div className={cn("tabular-nums", percentColorClass(unrealized))}>
            {formatCurrency(unrealized, "usd")}
            <span className="ml-1.5 text-xs">{formatPercent(pct)}</span>
          </div>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t pt-2.5 text-xs">
        <Meta label="Quantity" value={formatQuantity(p.quantity)} />
        <Meta
          label="24h"
          value={formatPercent(change24h)}
          className={percentColorClass(change24h)}
        />
        <Meta label="Avg cost" value={formatCurrency(avgCost, "usd")} />
        <Meta label="Price" value={formatCurrency(price, "usd")} />
        {p.realized !== 0 ? (
          <Meta
            label="Realized"
            value={formatCurrency(p.realized, "usd")}
            className={percentColorClass(p.realized)}
          />
        ) : null}
      </dl>
    </li>
  );
};

/** One label/value pair inside a position card's meta grid. */
const Meta = ({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}): React.ReactNode => (
  <div className="flex items-center justify-between gap-2">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className={cn("tabular-nums", className)}>{value}</dd>
  </div>
);
