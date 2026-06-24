"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { derivePositions } from "@/lib/portfolio-core";
import type { Holding, Position, Transaction } from "@/lib/types";

const STORAGE_KEY = "hodl:portfolio";

type NewTransaction = Omit<Transaction, "id" | "createdAt">;
type TransactionPatch = Partial<
  Pick<Transaction, "type" | "quantity" | "amount" | "date">
>;

interface PortfolioContextValue {
  transactions: Transaction[];
  /** Coin positions derived from the ledger (average-cost basis). */
  positions: Position[];
  addTransaction: (tx: NewTransaction) => void;
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

/** Parse stored JSON into transactions, migrating the legacy holding shape. */
const parseStored = (raw: string): Transaction[] | null => {
  const parsed = JSON.parse(raw) as unknown;
  if (isTransactionArray(parsed)) return parsed;
  if (isHoldingArray(parsed)) return parsed.map(holdingToTransaction);
  return null;
};

/**
 * Provides the user's portfolio transaction ledger, persisted to localStorage,
 * and the positions derived from it. All reads/writes go through this provider
 * so the storage layer can later be swapped for a backend. Mirrors the
 * watchlist/alerts providers; migrates pre-ledger `Holding[]` data on load.
 */
export const PortfolioProvider = ({
  children,
}: {
  children: ReactNode;
}): React.ReactNode => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const migrated = parseStored(stored);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (migrated) setTransactions(migrated);
      } catch {
        // ignore malformed storage
      }
    }
  }, []);

  const persist = (next: Transaction[]): void => {
    setTransactions(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const addTransaction = (tx: NewTransaction): void => {
    const entry: Transaction = {
      ...tx,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    persist([entry, ...transactions]);
  };

  const updateTransaction = (id: string, patch: TransactionPatch): void => {
    persist(transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const removeTransaction = (id: string): void => {
    persist(transactions.filter((t) => t.id !== id));
  };

  const clear = (): void => persist([]);

  const exportJson = (): string => JSON.stringify(transactions, null, 2);

  const importJson = (text: string): boolean => {
    try {
      const migrated = parseStored(text);
      if (!migrated) return false;
      persist(migrated);
      return true;
    } catch {
      return false;
    }
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
