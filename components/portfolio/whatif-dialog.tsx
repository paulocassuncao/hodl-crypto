"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMoney } from "@/hooks/use-money";
import { formatPercent, formatQuantity } from "@/lib/format";
import { whatIf, type PriceMap } from "@/lib/portfolio-core";
import type { Position } from "@/lib/types";
import { cn } from "@/lib/utils";

interface WhatIfDialogProps {
  positions: Position[];
  prices: PriceMap;
}

/** "What if I added $X to a holding?" — forward projection at current prices. */
export const WhatIfDialog = ({
  positions,
  prices,
}: WhatIfDialogProps): React.ReactNode => {
  const [coinId, setCoinId] = useState(positions[0]?.coinId ?? "");
  const [amount, setAmount] = useState("");
  const money = useMoney();

  // The entered amount is in the active currency; convert to USD for the math.
  const usd = money.toUsd(Number(amount));
  const result =
    coinId && usd > 0 && Number.isFinite(usd)
      ? whatIf(positions, prices, coinId, usd)
      : null;

  const rows: { label: string; value: string }[] = result
    ? [
        { label: "Buys", value: `${formatQuantity(result.addedUnits)} units` },
        { label: "New avg cost", value: money.format(result.newAvgCost) },
        {
          label: "New total value",
          value: money.format(result.newValue),
        },
        {
          label: "Unrealized P&L",
          value: `${money.format(result.newPnl)} (${formatPercent(result.newPnlPct)})`,
        },
        {
          label: "New allocation",
          value: `${result.newAllocationPct.toFixed(1)}%`,
        },
      ]
    : [];

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1">
            <Calculator className="size-4" />
            <span className="hidden sm:inline">What-if</span>
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What-if calculator</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Add to</span>
            <select
              value={coinId}
              onChange={(e) => setCoinId(e.target.value)}
              className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            >
              {positions.map((p) => (
                <option key={p.coinId} value={p.coinId}>
                  {p.name} ({p.symbol.toUpperCase()})
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">
              Amount to invest ({money.currency.toUpperCase()})
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
          </label>

          {result ? (
            <dl className="space-y-1.5 rounded-lg border bg-card p-3 text-sm">
              {rows.map((r, i) => (
                <div
                  key={r.label}
                  className={cn(
                    "flex justify-between gap-4",
                    i === rows.length - 1 &&
                      "border-t pt-1.5 text-muted-foreground",
                  )}
                >
                  <dt className="text-muted-foreground">{r.label}</dt>
                  <dd className="tabular-nums">{r.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-xs text-muted-foreground">
              Projected at the current price. Enter an amount to preview the
              blended position.
            </p>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Close</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
