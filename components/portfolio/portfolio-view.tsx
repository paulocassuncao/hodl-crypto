"use client";

import { useRef } from "react";
import { Download, FileDown, FileUp, Plus, Upload, Wallet } from "lucide-react";
import { toast } from "sonner";

import { AnalyticsSection } from "@/components/portfolio/analytics-section";
import { DcaDialog } from "@/components/portfolio/dca-dialog";
import { PortfolioSummary } from "@/components/portfolio/portfolio-summary";
import { PositionsTable } from "@/components/portfolio/positions-table";
import { TransactionForm } from "@/components/portfolio/transaction-form";
import { TransactionsList } from "@/components/portfolio/transactions-list";
import { WhatIfDialog } from "@/components/portfolio/whatif-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortfolioPrices } from "@/hooks/use-portfolio-prices";
import { parseTransactionsCsv, transactionsToCsv } from "@/lib/csv";
import { download } from "@/lib/download";
import { usePortfolio } from "@/lib/portfolio";

/** Smallest quantity treated as an open position (guards float residue). */
const DUST = 1e-8;

/** Portfolio page body: summary, analytics, positions, ledger, and actions. */
export const PortfolioView = (): React.ReactNode => {
  const { transactions, positions, addTransactions, exportJson, importJson } =
    usePortfolio();
  const open = positions.filter((p) => p.quantity > DUST);
  const { data: prices, isLoading } = usePortfolioPrices(
    open.map((p) => p.coinId),
  );
  const csvInput = useRef<HTMLInputElement>(null);
  const jsonInput = useRef<HTMLInputElement>(null);

  const symbolFor = (coinId: string): string =>
    positions.find((p) => p.coinId === coinId)?.symbol ?? coinId;

  const handleCsvExport = (): void => {
    download(
      "hodl-portfolio.csv",
      transactionsToCsv(transactions),
      "text/csv;charset=utf-8",
    );
  };

  const handleCsvImport = (file: File): void => {
    void file.text().then((text) => {
      const { rows, errors } = parseTransactionsCsv(text);
      if (rows.length > 0) {
        addTransactions(rows);
        toast.success(
          `Imported ${rows.length} transaction${rows.length === 1 ? "" : "s"}.`,
          errors.length > 0
            ? { description: `${errors.length} row(s) skipped.` }
            : undefined,
        );
      } else {
        toast.error(errors[0] ?? "No valid transactions found in that file.");
      }
    });
  };

  const handleJsonExport = (): void => {
    download("hodl-portfolio.json", exportJson(), "application/json");
  };

  const handleJsonImport = (file: File): void => {
    void file.text().then((text) => {
      if (importJson(text)) {
        toast.success("Portfolio imported.");
      } else {
        toast.error(
          "Couldn't read that file — expected a HODL portfolio export.",
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Portfolio</h1>
          <p className="text-sm text-muted-foreground">
            Buy/sell ledger · average cost · values in USD · synced to your
            account
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={csvInput}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleCsvImport(file);
              e.target.value = "";
            }}
          />
          <input
            ref={jsonInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleJsonImport(file);
              e.target.value = "";
            }}
          />
          {/* Export actions need existing data; import/restore must stay
              available when empty (e.g. first sign-in, restoring a backup). */}
          {transactions.length > 0 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleCsvExport}
              >
                <FileDown className="size-4" />
                <span className="hidden sm:inline">CSV</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleJsonExport}
                title="Export a full JSON backup"
              >
                <Download className="size-4" />
                <span className="hidden sm:inline">Backup</span>
              </Button>
            </>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => csvInput.current?.click()}
          >
            <FileUp className="size-4" />
            <span className="hidden sm:inline">Import CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => jsonInput.current?.click()}
            title="Restore from a JSON backup (replaces current data)"
          >
            <Upload className="size-4" />
            <span className="hidden sm:inline">Restore</span>
          </Button>
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
              <AnalyticsSection positions={open} prices={prices} />
              <div className="flex justify-end gap-2">
                <WhatIfDialog positions={open} prices={prices} />
                <DcaDialog positions={open} />
              </div>
              <PositionsTable positions={open} prices={prices} />
            </>
          ) : null}
          <TransactionsList transactions={transactions} />
        </>
      )}
    </div>
  );
};
