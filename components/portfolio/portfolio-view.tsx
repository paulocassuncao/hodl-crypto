"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Download,
  FileDown,
  FileUp,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Upload,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { AnalyticsSection } from "@/components/portfolio/analytics-section";
import { PortfolioSummary } from "@/components/portfolio/portfolio-summary";
import { PositionsTable } from "@/components/portfolio/positions-table";
import { TransactionForm } from "@/components/portfolio/transaction-form";
import { TransactionsList } from "@/components/portfolio/transactions-list";
import { WhatIfDialog } from "@/components/portfolio/whatif-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortfolioPrices } from "@/hooks/use-portfolio-prices";
import { parseTransactionsCsv, transactionsToCsv } from "@/lib/csv";
import { download } from "@/lib/download";
import { usePortfolio } from "@/lib/portfolio";

// The DCA backtest dialog carries a recharts mini-chart; defer its chunk so it
// loads only when a user reaches for it. The fallback mirrors the trigger's
// footprint (icon-only on phones, labelled on sm+) to avoid a toolbar shift.
const DcaDialog = dynamic(
  () => import("@/components/portfolio/dca-dialog").then((m) => m.DcaDialog),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-7 w-9 rounded-lg pointer-coarse:h-11 sm:w-32" />
    ),
  },
);

/** Smallest quantity treated as an open position (guards float residue). */
const DUST = 1e-8;

/** Portfolio page body: summary, analytics, positions, ledger, and actions. */
export const PortfolioView = (): React.ReactNode => {
  const {
    transactions,
    positions,
    addTransactions,
    exportJson,
    importJson,
    reload,
  } = usePortfolio();
  const [syncing, setSyncing] = useState(false);
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

  const handleBybitSync = async (): Promise<void> => {
    setSyncing(true);
    try {
      const res = await fetch("/api/portfolio/sync-bybit", { method: "POST" });
      const body = (await res.json()) as {
        inserted?: number;
        skipped?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? `Sync failed (${res.status})`);
      await reload();
      const inserted = body.inserted ?? 0;
      toast.success(
        inserted > 0
          ? `Imported ${inserted} new buy${inserted === 1 ? "" : "s"} from Bybit.`
          : "Already up to date — no new Bybit buys.",
        body.skipped
          ? { description: `${body.skipped} duplicate(s) skipped.` }
          : undefined,
      );
    } catch (error) {
      toast.error("Bybit sync failed.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSyncing(false);
    }
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Portfolio</h1>
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
          {/*
           * Data in/out (sync, import, export, restore) collapses into one
           * labeled overflow menu — six sibling icon-buttons on desktop, and on
           * mobile five near-identical up/down arrows, gave no way to tell
           * Backup from Import from Restore. Only "Add transaction", the primary
           * action, stays a button. Export items appear only with data; import
           * and restore stay available when empty (first sign-in, restore).
           */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  aria-label="Import, export, and sync data"
                />
              }
            >
              <MoreHorizontal className="size-4" />
              <span className="hidden sm:inline">Data</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => void handleBybitSync()}
                disabled={syncing}
              >
                <RefreshCw
                  className={`size-4 ${syncing ? "animate-spin" : ""}`}
                />
                {syncing ? "Syncing from Bybit…" : "Sync from Bybit"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => csvInput.current?.click()}>
                <FileUp className="size-4" />
                Import CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => jsonInput.current?.click()}>
                <Upload className="size-4" />
                Restore from backup
              </DropdownMenuItem>
              {transactions.length > 0 ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleCsvExport}>
                    <FileDown className="size-4" />
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleJsonExport}>
                    <Download className="size-4" />
                    Download backup
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
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
        <div className="flex flex-col items-center gap-3 rounded-lg glass-panel p-12 text-center">
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
