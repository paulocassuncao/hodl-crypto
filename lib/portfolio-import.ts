/**
 * Pure validation for the portfolio JSON restore — no React, no I/O — so it
 * can be unit-tested directly (same split as `portfolio-core.ts`).
 *
 * A restore is a delete-all followed by an insert with no transaction around
 * it, so validation here is load-bearing: every field `toRow` will read must
 * be proven usable BEFORE the provider deletes anything. A row that only fails
 * at `new Date(x).toISOString()`, mid-write, costs the user their whole ledger.
 */

import type { Holding, Transaction } from "@/lib/types";

/** A real number — rejects NaN/Infinity, which `typeof` alone lets through. */
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** Transactions in the current export shape, with every persisted field usable. */
export const isTransactionArray = (value: unknown): value is Transaction[] =>
  Array.isArray(value) &&
  value.every((raw): raw is Transaction => {
    if (typeof raw !== "object" || raw === null) return false;
    const t = raw as Transaction;
    return (
      typeof t.coinId === "string" &&
      (t.type === "buy" || t.type === "sell") &&
      isFiniteNumber(t.quantity) &&
      isFiniteNumber(t.amount) &&
      isFiniteNumber(t.date) &&
      isFiniteNumber(t.createdAt) &&
      typeof t.symbol === "string" &&
      typeof t.name === "string" &&
      typeof t.image === "string"
    );
  });

/** Legacy single-position records (pre-ledger). */
export const isHoldingArray = (value: unknown): value is Holding[] =>
  Array.isArray(value) &&
  value.every((raw): raw is Holding => {
    if (typeof raw !== "object" || raw === null) return false;
    const h = raw as Holding;
    return (
      typeof h.coinId === "string" &&
      isFiniteNumber(h.quantity) &&
      isFiniteNumber(h.cost) &&
      isFiniteNumber(h.createdAt) &&
      !("type" in (raw as object))
    );
  });

/** Convert a legacy holding into a single equivalent "buy" transaction. */
export const holdingToTransaction = (h: Holding): Transaction => ({
  id: h.id || crypto.randomUUID(),
  coinId: h.coinId,
  // The legacy shape predates these columns being required; fall back to the
  // coin id so a migrated row is always insertable.
  symbol: h.symbol ?? h.coinId,
  name: h.name ?? h.coinId,
  image: h.image ?? "",
  type: "buy",
  quantity: h.quantity,
  amount: h.cost,
  date: h.createdAt,
  createdAt: h.createdAt,
});

/**
 * Parse imported JSON into transactions, migrating the legacy holding shape.
 * Returns null for anything that isn't a fully-valid ledger — callers must
 * treat that as "reject the file", never as "restore what parsed".
 */
export const parseImport = (raw: string): Transaction[] | null => {
  const parsed = JSON.parse(raw) as unknown;
  if (isTransactionArray(parsed)) return parsed;
  if (isHoldingArray(parsed)) return parsed.map(holdingToTransaction);
  return null;
};
