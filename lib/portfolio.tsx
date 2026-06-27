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
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  toRow,
  toTransaction,
  type TransactionRow,
} from "@/lib/supabase/types";
import type { Holding, Position, Transaction } from "@/lib/types";

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
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

const isTransactionArray = (value: unknown): value is Transaction[] =>
  Array.isArray(value) &&
  value.every(
    (t): t is Transaction =>
      typeof t === "object" &&
      t !== null &&
      typeof (t as Transaction).coinId === "string" &&
      ((t as Transaction).type === "buy" ||
        (t as Transaction).type === "sell") &&
      typeof (t as Transaction).quantity === "number" &&
      typeof (t as Transaction).amount === "number",
  );

/** Legacy single-position records (pre-ledger). */
const isHoldingArray = (value: unknown): value is Holding[] =>
  Array.isArray(value) &&
  value.every(
    (h): h is Holding =>
      typeof h === "object" &&
      h !== null &&
      typeof (h as Holding).coinId === "string" &&
      typeof (h as Holding).quantity === "number" &&
      typeof (h as Holding).cost === "number" &&
      !("type" in (h as object)),
  );

/** Convert a legacy holding into a single equivalent "buy" transaction. */
const holdingToTransaction = (h: Holding): Transaction => ({
  id: h.id || crypto.randomUUID(),
  coinId: h.coinId,
  symbol: h.symbol,
  name: h.name,
  image: h.image,
  type: "buy",
  quantity: h.quantity,
  amount: h.cost,
  date: h.createdAt,
  createdAt: h.createdAt,
});

/** Parse imported JSON into transactions, migrating the legacy holding shape. */
const parseImport = (raw: string): Transaction[] | null => {
  const parsed = JSON.parse(raw) as unknown;
  if (isTransactionArray(parsed)) return parsed;
  if (isHoldingArray(parsed)) return parsed.map(holdingToTransaction);
  return null;
};

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
    void Promise.resolve(op()).then(({ error }) => {
      if (error) {
        toast.error("Couldn't save changes.", { description: error.message });
        void reload();
      }
    });
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
    // Replace: optimistic swap, then delete-all + insert in Supabase.
    const next = parsed.map((t) => ({
      ...t,
      id: t.id || crypto.randomUUID(),
    }));
    setTransactions(next);
    persist(async () => {
      if (!userId) return { error: { message: "Not signed in" } };
      const del = await supabase
        .from("transactions")
        .delete()
        .eq("user_id", userId);
      if (del.error) return del;
      return supabase
        .from("transactions")
        .insert(next.map((t) => toRow(t, userId)));
    });
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
