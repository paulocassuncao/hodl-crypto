"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { formatQuantity } from "@/lib/format";
import { derivePositions } from "@/lib/portfolio-core";
import { parseImport } from "@/lib/portfolio-import";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  toRow,
  toTransaction,
  type TransactionRow,
} from "@/lib/supabase/types";
import type { Position, Transaction } from "@/lib/types";

type NewTransaction = Omit<Transaction, "id" | "createdAt">;
type TransactionPatch = Partial<
  Pick<Transaction, "type" | "quantity" | "amount" | "date">
>;

interface PortfolioContextValue {
  transactions: Transaction[];
  /** Coin positions derived from the ledger (average-cost basis). */
  positions: Position[];
  addTransaction: (tx: NewTransaction) => void;
  /** Append several transactions at once (e.g. a CSV import). */
  addTransactions: (txs: NewTransaction[]) => void;
  updateTransaction: (id: string, patch: TransactionPatch) => void;
  removeTransaction: (id: string) => void;
  clear: () => void;
  /** Serialize transactions to a JSON string for download/backup. */
  exportJson: () => string;
  /** Replace transactions from a JSON string; false if it can't be parsed. */
  importJson: (text: string) => boolean;
  /** Re-fetch the ledger from Supabase (after a server-side import). */
  reload: () => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

/**
 * Provides the signed-in user's transaction ledger, persisted to Supabase
 * (row-level-security scoped per user), and the positions derived from it.
 * All reads/writes go through this provider. Mutations update local state
 * optimistically, then sync to Supabase; on failure they re-fetch to resync.
 * Mirrors the watchlist/alerts providers' context shape so consumers are
 * unchanged. Replaces the previous localStorage-backed implementation.
 */
export const PortfolioProvider = ({
  children,
}: {
  children: ReactNode;
}): React.ReactNode => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const supabase = getSupabaseBrowserClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const reload = async (): Promise<void> => {
    if (!userId) {
      setTransactions([]);
      return;
    }
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false });
    if (error) {
      toast.error("Couldn't load your portfolio.", {
        description: error.message,
      });
      return;
    }
    setTransactions((data ?? []).map(toTransaction));
  };

  useEffect(() => {
    // Fetch the user's ledger on sign-in and clear it on sign-out — a
    // deliberate data-sync effect keyed on userId (mirrors the watchlist/
    // alerts providers). reload() owns the setState here by design.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /** Run a Supabase write; on failure surface a toast and re-sync from server. */
  const persist = <T extends { error: { message: string } | null }>(
    op: () => PromiseLike<T>,
  ): void => {
    if (!userId) {
      toast.error("Sign in to save your portfolio.");
      return;
    }
    const fail = (description: string): void => {
      toast.error("Couldn't save changes.", { description });
      void reload();
    };
    // `op()` can throw synchronously (an unserializable row reaches `toRow`)
    // as well as reject — both must surface as a toast + resync, never as an
    // unhandled rejection that leaves the UI showing a write that never landed.
    try {
      void Promise.resolve(op()).then(
        ({ error }) => {
          if (error) fail(error.message);
        },
        (error: unknown) =>
          fail(error instanceof Error ? error.message : String(error)),
      );
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }
  };

  const addTransaction = (tx: NewTransaction): void => {
    const entry: Transaction = {
      ...tx,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setTransactions((prev) => [entry, ...prev]);
    persist(() =>
      supabase.from("transactions").insert(toRow(entry, userId!)),
    );
  };

  const addTransactions = (txs: NewTransaction[]): void => {
    const now = Date.now();
    const entries: Transaction[] = txs.map((tx, i) => ({
      ...tx,
      id: crypto.randomUUID(),
      createdAt: now + i,
    }));
    setTransactions((prev) => [...entries, ...prev]);
    persist(() =>
      supabase
        .from("transactions")
        .insert(entries.map((e) => toRow(e, userId!))),
    );
  };

  const updateTransaction = (id: string, patch: TransactionPatch): void => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
    const rowPatch: Partial<TransactionRow> = {};
    if (patch.type !== undefined) rowPatch.type = patch.type;
    if (patch.quantity !== undefined) rowPatch.quantity = patch.quantity;
    if (patch.amount !== undefined) rowPatch.amount = patch.amount;
    if (patch.date !== undefined)
      rowPatch.date = new Date(patch.date).toISOString();
    persist(() =>
      supabase.from("transactions").update(rowPatch).eq("id", id),
    );
  };

  const removeTransaction = (id: string): void => {
    const removed = transactions.find((t) => t.id === id);
    if (!removed) return;
    // Optimistic removal — the row leaves the table immediately and the delete
    // is committed to Supabase. Undo re-inserts the exact row (id, createdAt and
    // all), so a misclick is reversible without keeping soft-deleted rows around.
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    persist(() => supabase.from("transactions").delete().eq("id", id));
    toast("Transaction deleted", {
      duration: 6000,
      description: `${removed.type === "buy" ? "Buy" : "Sell"} of ${formatQuantity(
        removed.quantity,
      )} ${removed.symbol.toUpperCase()}`,
      action: {
        label: "Undo",
        onClick: () => {
          setTransactions((prev) =>
            prev.some((t) => t.id === removed.id) ? prev : [removed, ...prev],
          );
          persist(() =>
            supabase.from("transactions").insert(toRow(removed, userId!)),
          );
        },
      },
    });
  };

  const clear = (): void => {
    setTransactions([]);
    persist(() =>
      supabase.from("transactions").delete().eq("user_id", userId!),
    );
  };

  const exportJson = (): string => JSON.stringify(transactions, null, 2);

  const importJson = (text: string): boolean => {
    let parsed: Transaction[] | null;
    try {
      parsed = parseImport(text);
    } catch {
      return false;
    }
    if (!parsed) return false;
    if (!userId) {
      toast.error("Sign in to restore your portfolio.");
      return false;
    }

    const next = parsed.map((t) => ({
      ...t,
      id: t.id || crypto.randomUUID(),
    }));

    // Serialize BEFORE touching the server. A restore is a delete-all followed
    // by an insert, and Supabase gives us no transaction here — so anything
    // that can fail must fail now, while the ledger is still intact.
    let nextRows: ReturnType<typeof toRow>[];
    let previousRows: ReturnType<typeof toRow>[];
    const previous = transactions;
    try {
      nextRows = next.map((t) => toRow(t, userId));
      previousRows = previous.map((t) => toRow(t, userId));
    } catch {
      return false;
    }

    setTransactions(next);
    void (async () => {
      const del = await supabase
        .from("transactions")
        .delete()
        .eq("user_id", userId);
      if (del.error) {
        // Nothing was deleted — just put the UI back.
        toast.error("Couldn't restore your portfolio.", {
          description: del.error.message,
        });
        setTransactions(previous);
        return;
      }

      const ins = await supabase.from("transactions").insert(nextRows);
      if (!ins.error) return;

      // The delete already committed, so the old ledger only exists in memory:
      // put it back rather than leaving the user with nothing.
      const rollback = await supabase.from("transactions").insert(previousRows);
      toast.error(
        rollback.error
          ? "Restore failed and the previous ledger could not be recovered — use your last backup."
          : "Restore failed — your previous transactions were kept.",
        { description: ins.error.message },
      );
      await reload();
    })();
    return true;
  };

  const positions = useMemo(
    () => derivePositions(transactions),
    [transactions],
  );

  return (
    <PortfolioContext.Provider
      value={{
        transactions,
        positions,
        addTransaction,
        addTransactions,
        updateTransaction,
        removeTransaction,
        clear,
        exportJson,
        importJson,
        reload,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = (): PortfolioContextValue => {
  const ctx = useContext(PortfolioContext);
  if (!ctx)
    throw new Error("usePortfolio must be used within a PortfolioProvider");
  return ctx;
};
