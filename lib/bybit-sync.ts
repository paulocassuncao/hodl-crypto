/**
 * Pure append-only sync planning for the Bybit spot import — no I/O so it can
 * be unit-tested directly.
 *
 * The Supabase ledger is the source of truth (the February DCA-bot buys do NOT
 * exist in Bybit's spot execution API), so a sync may only ever INSERT new
 * rows: candidates at or before the ledger's latest date are dropped, and a
 * safety-net dedup skips candidates that match an existing row closely enough
 * to be the same fill entered manually. Never returns updates or deletions.
 */

import type { Transaction } from "@/lib/types";

/** Candidates within this window of an existing row can be the same fill. */
const DEDUP_WINDOW_MS = 5 * 60 * 1000;
/** Quantity tolerance for the duplicate match. */
const DEDUP_QTY_EPS = 1e-8;

export interface SyncPlan {
  /** New transactions to insert, oldest first. */
  toInsert: Transaction[];
  /** Candidates skipped because an existing row already covers them. */
  skippedDuplicates: Transaction[];
  /** The ledger's latest date (epoch ms) used as the import cutoff; 0 when empty. */
  cutoff: number;
}

/** Latest transaction date in the ledger (0 when empty). */
export const syncCutoff = (existing: Transaction[]): number =>
  existing.reduce((max, tx) => Math.max(max, tx.date), 0);

const isDuplicate = (candidate: Transaction, existing: Transaction): boolean =>
  existing.coinId === candidate.coinId &&
  Math.abs(existing.date - candidate.date) <= DEDUP_WINDOW_MS &&
  Math.abs(existing.quantity - candidate.quantity) <= DEDUP_QTY_EPS;

/**
 * Plan an append-only sync: keep only candidates strictly after the ledger's
 * latest date, then skip any that duplicate an existing row (same coin, date
 * within ±5 minutes, quantity within epsilon — a spot buy after the cutoff
 * that was already entered manually). Re-running with the inserted result in
 * `existing` yields an empty plan, so the sync is idempotent.
 */
export const planSync = (
  existing: Transaction[],
  candidates: Transaction[],
): SyncPlan => {
  const cutoff = syncCutoff(existing);
  const toInsert: Transaction[] = [];
  const skippedDuplicates: Transaction[] = [];

  const ordered = [...candidates].sort((a, b) => a.date - b.date);
  for (const candidate of ordered) {
    if (candidate.date <= cutoff) continue;
    const dupe =
      existing.some((tx) => isDuplicate(candidate, tx)) ||
      toInsert.some((tx) => isDuplicate(candidate, tx));
    if (dupe) skippedDuplicates.push(candidate);
    else toInsert.push(candidate);
  }

  return { toInsert, skippedDuplicates, cutoff };
};
