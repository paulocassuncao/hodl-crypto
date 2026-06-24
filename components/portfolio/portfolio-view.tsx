"use client";

import { useRef } from "react";
import { Download, Plus, Upload, Wallet } from "lucide-react";
import { toast } from "sonner";

import { PortfolioSummary } from "@/components/portfolio/portfolio-summary";
import { PositionsTable } from "@/components/portfolio/positions-table";
import { TransactionForm } from "@/components/portfolio/transaction-form";
import { TransactionsList } from "@/components/portfolio/transactions-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortfolioPrices } from "@/hooks/use-portfolio-prices";
import { usePortfolio } from "@/lib/portfolio";

/** Smallest quantity treated as an open position (guards float residue). */
const DUST = 1e-8;

/** Portfolio page body: summary, positions, transaction ledger, and actions. */
export const PortfolioView = (): React.ReactNode => {
  const { transactions, positions, exportJson, importJson } = usePortfolio();
  const open = positions.filter((p) => p.quantity > DUST);
  const { data: prices, isLoading } = usePortfolioPrices(
    open.map((p) => p.coinId),
  );
  const fileInput = useRef<HTMLInputElement>(null);

  const symbolFor = (coinId: string): string =>
    positions.find((p) => p.coinId === coinId)?.symbol ?? coinId;

  const handleExport = (): void => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hodl-portfolio.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File): void => {
    void file.text().then((text) => {
      if (importJson(text)) {
        toast.success("Portfolio imported.");
      } else {
        toast.error("Couldn't read that file — expected a HODL portfolio export.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            Buy/sell ledger · average cost · values in USD · stored on this
            device
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
              e.target.value = "";
            }}
          />
          {transactions.length > 0 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleExport}
              >
                <Download className="size-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => fileInput.current?.click()}
              >
                <Upload className="size-4" />
                <span className="hidden sm:inline">Import</span>
              </Button>
            </>
          ) : null}
          <TransactionForm
            trigger={
              <Button size="sm" className="gap-1">
                <Plus className="size-4" />
                Add transaction
              </Button>
            }
          />
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-12 text-center">
          <Wallet className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium">No transactions yet</p>
            <p className="text-sm text-muted-foreground">
              Record a buy or sell to track positions, average cost, and P&L.
            </p>
          </div>
          <TransactionForm
            trigger={
              <Button className="gap-1">
                <Plus className="size-4" />
                Add your first transaction
              </Button>
            }
          />
        </div>
      ) : isLoading || !prices ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          {open.length > 0 ? (
            <>
              <PortfolioSummary
                positions={open}
                prices={prices}
                symbolFor={symbolFor}
              />
              <PositionsTable positions={open} prices={prices} />
            </>
          ) : null}
          <TransactionsList transactions={transactions} />
        </>
      )}
    </div>
  );
};
