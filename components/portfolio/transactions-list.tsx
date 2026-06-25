"use client";

import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";

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
import { formatCurrency, formatQuantity } from "@/lib/format";
import { usePortfolio } from "@/lib/portfolio";
import type { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

const formatDate = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

/** Buy/sell pill — green for buys, red for sells, in both table and card. */
const TypeBadge = ({
  type,
}: {
  type: Transaction["type"];
}): React.ReactNode => (
  <span
    className={cn(
      "rounded px-1.5 py-0.5 text-xs font-medium capitalize",
      type === "buy" ? "bg-gain/15 text-gain" : "bg-loss/15 text-loss",
    )}
  >
    {type}
  </span>
);

/** Full buy/sell ledger, newest first, with per-transaction edit/remove. */
export const TransactionsList = ({
  transactions,
}: {
  transactions: Transaction[];
}): React.ReactNode => {
  const { removeTransaction } = usePortfolio();
  const ordered = [...transactions].sort(
    (a, b) => b.date - a.date || b.createdAt - a.createdAt,
  );

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Transactions</h2>

      {/* Mobile: stacked cards instead of a 6-column horizontal scroll. */}
      <ul className="space-y-2 md:hidden">
        {ordered.map((t) => (
          <li key={t.id} className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2">
              {t.image ? (
                <Image
                  src={t.image}
                  alt=""
                  width={24}
                  height={24}
                  className="shrink-0 rounded-full"
                />
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
                <span className="text-sm font-medium tabular-nums">
                  {formatCurrency(t.amount, "usd")}
                </span>
                <TxActions transaction={t} onRemove={removeTransaction} />
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* md+: full ledger table. */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Coin</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordered.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="tabular-nums text-muted-foreground">
                  {formatDate(t.date)}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    {t.image ? (
                      <Image
                        src={t.image}
                        alt=""
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
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
                  {formatCurrency(t.amount, "usd")}
                </TableCell>
                <TableCell className="text-right">
                  <TxActions transaction={t} onRemove={removeTransaction} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
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
