"use client";

import { useState } from "react";
import { CoinIcon } from "@/components/coin-icon";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";

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
import { useMoney } from "@/hooks/use-money";
import {
  formatPercent,
  formatQuantity,
  percentColorClass,
} from "@/lib/format";
import { usePortfolio } from "@/lib/portfolio";
import { transactionValue, type PriceMap } from "@/lib/portfolio-core";
import type { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

const formatDate = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

/**
 * Buy/sell pill — green for buys, red for sells, in both table and card.
 *
 * This is a deliberate, sanctioned extension of the gain/loss direction channel:
 * a buy accumulates (green) and a sell reduces (red), which reads the same way a
 * trader already parses the market. The literal "Buy"/"Sell" text carries the
 * meaning independent of hue, so the signal survives color blindness/grayscale
 * (it never relies on color alone). Text uses the `-ink` shades so it clears AA
 * (≥4.5:1) on the soft same-hue tint, where the full-strength tokens fell short.
 */
const TypeBadge = ({
  type,
}: {
  type: Transaction["type"];
}): React.ReactNode => (
  <span
    className={cn(
      "rounded px-1.5 py-0.5 text-xs font-medium capitalize",
      type === "buy" ? "bg-gain/15 text-gain-ink" : "bg-loss/15 text-loss-ink",
    )}
  >
    {type}
  </span>
);

/** Full buy/sell ledger, newest first, with per-transaction edit/remove. */
export const TransactionsList = ({
  transactions,
  prices,
}: {
  transactions: Transaction[];
  /** Live prices, used to value each buy at today's price. */
  prices: PriceMap;
}): React.ReactNode => {
  const { removeTransaction } = usePortfolio();
  const money = useMoney();
  const [showAll, setShowAll] = useState(false);
  const ordered = [...transactions].sort(
    (a, b) => b.date - a.date || b.createdAt - a.createdAt,
  );

  const COLLAPSED_LIMIT = 10;
  const hasMore = ordered.length > COLLAPSED_LIMIT;
  const visible = showAll ? ordered : ordered.slice(0, COLLAPSED_LIMIT);

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Transactions</h2>

      {/* Mobile: stacked cards instead of a 6-column horizontal scroll.
          When expanded, cap the height so the page stays compact. */}
      <ul
        className={cn(
          "space-y-2 md:hidden",
          showAll && "scrollbar-subtle max-h-[60vh] overflow-y-auto",
        )}
      >
        {visible.map((t) => {
          const valued = transactionValue(t, prices);
          return (
          <li key={t.id} className="rounded-lg glass-panel p-3">
            <div className="flex items-center gap-2">
              {t.image ? (
                <CoinIcon src={t.image} size={24} />
              ) : null}
              <span className="min-w-0 truncate font-medium">{t.name}</span>
              <span className="shrink-0 text-xs uppercase text-muted-foreground">
                {t.symbol}
              </span>
              <span className="ml-auto shrink-0">
                <TypeBadge type={t.type} />
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="text-xs tabular-nums text-muted-foreground">
                {formatDate(t.date)} · {formatQuantity(t.quantity)} {t.symbol.toUpperCase()}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-right text-sm font-medium tabular-nums">
                  {money.format(t.amount)}
                  {valued ? (
                    <span className="block text-xs font-normal text-muted-foreground">
                      now {money.format(valued.currentValue)}{" "}
                      <span className={percentColorClass(valued.pnl)}>
                        {formatPercent(valued.pnlPct)}
                      </span>
                    </span>
                  ) : null}
                </span>
                <TxActions transaction={t} onRemove={removeTransaction} />
              </div>
            </div>
          </li>
          );
        })}
      </ul>

      {/* md+: full ledger table. When expanded, cap the container height and
          let it scroll with a sticky header so it never runs off the page. */}
      <div
        className={cn(
          "hidden md:block",
          showAll &&
            "[&_[data-slot=table-container]]:scrollbar-subtle [&_[data-slot=table-container]]:max-h-[60vh] [&_[data-slot=table-container]]:overflow-y-auto",
        )}
      >
        <Table>
          <TableHeader className="sticky top-0 z-(--z-table-header) bg-background [&_th]:bg-background">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Coin</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Value Now</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((t) => {
              const valued = transactionValue(t, prices);
              return (
              <TableRow key={t.id}>
                <TableCell className="tabular-nums text-muted-foreground">
                  {formatDate(t.date)}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    {t.image ? (
                      <CoinIcon src={t.image} size={20} />
                    ) : null}
                    <span className="font-medium">{t.name}</span>
                    <span className="text-xs uppercase text-muted-foreground">
                      {t.symbol}
                    </span>
                  </span>
                </TableCell>
                <TableCell>
                  <TypeBadge type={t.type} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatQuantity(t.quantity)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money.format(t.amount)}
                </TableCell>
                {/* Sells have proceeds, not a holding to price — they stay
                    blank rather than inviting a false comparison. */}
                <TableCell className="text-right tabular-nums">
                  {valued ? (
                    <>
                      <div>{money.format(valued.currentValue)}</div>
                      <div
                        className={cn("text-xs", percentColorClass(valued.pnl))}
                      >
                        {formatPercent(valued.pnlPct)}
                      </div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <TxActions transaction={t} onRemove={removeTransaction} />
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Collapse the ledger to the most recent rows by default; reveal the
          rest on demand so it doesn't dominate the page. */}
      {hasMore ? (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          aria-expanded={showAll}
          onClick={() => setShowAll((prev) => !prev)}
        >
          {showAll ? "Show less" : `Show all ${ordered.length} transactions`}
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              showAll && "rotate-180",
            )}
          />
        </Button>
      ) : null}
    </section>
  );
};

/** Edit + remove controls for a transaction, shared by the row and card. */
const TxActions = ({
  transaction: t,
  onRemove,
}: {
  transaction: Transaction;
  onRemove: (id: string) => void;
}): React.ReactNode => (
  <div className="flex justify-end gap-1">
    <TransactionForm
      transaction={t}
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${t.name} transaction`}
        >
          <Pencil className="size-4" />
        </Button>
      }
    />
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Remove ${t.name} transaction`}
      onClick={() => onRemove(t.id)}
    >
      <Trash2 className="size-4" />
    </Button>
  </div>
);
