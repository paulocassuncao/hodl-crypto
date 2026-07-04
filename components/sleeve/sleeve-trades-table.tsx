"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatQuantity } from "@/lib/format";
import type { SleeveTradeRow } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const formatDate = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

/**
 * Buy/sell pill matching the portfolio ledger's TypeBadge: green accumulates,
 * red reduces; the literal text carries the meaning without relying on color.
 */
const SideBadge = ({
  side,
}: {
  side: SleeveTradeRow["side"];
}): React.ReactNode => (
  <span
    className={cn(
      "rounded px-1.5 py-0.5 text-xs font-medium capitalize",
      side === "buy" ? "bg-gain/15 text-gain-ink" : "bg-loss/15 text-loss-ink",
    )}
  >
    {side}
  </span>
);

/** Simulated fill log, newest first. All dollar figures are fictitious. */
export const SleeveTradesTable = ({
  trades,
}: {
  trades: SleeveTradeRow[];
}): React.ReactNode => (
  <div className="rounded-xl border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Asset</TableHead>
          <TableHead>Side</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Units</TableHead>
          <TableHead className="text-right">Exposure after</TableHead>
          <TableHead className="text-right">Equity after</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trades.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="whitespace-nowrap">
              {formatDate(t.time_ms)}
            </TableCell>
            <TableCell className="font-medium">{t.asset}</TableCell>
            <TableCell>
              <SideBadge side={t.side} />
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(t.price, "usd")}
            </TableCell>
            <TableCell className="text-right">
              {formatQuantity(t.units)}
            </TableCell>
            <TableCell className="text-right">
              {t.position_after.toFixed(2)}x
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(t.equity_after, "usd")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);
