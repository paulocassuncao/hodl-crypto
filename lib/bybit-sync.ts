/**
 * Pure append-only sync planning for the Bybit spot import — no I/O so it can
 * be unit-tested directly.
 *
 * The Supabase ledger is the source of truth (the February DCA-bot buys do NOT
 * exist in Bybit's spot execution API), so a sync may only ever INSERT new
 * rows. What keeps it from re-importing history is the caller's scan window
 * plus a dedup against rows already in the ledger — never the ledger's own
 * latest date. Never returns updates or deletions.
 *
 * Anchoring on the ledger's latest date is exactly what this must NOT do: the
 * DCA rows advance that date without ever appearing in Bybit's API, so a real
 * fill timestamped before the newest manual/DCA row would be dropped — and
 * since the caller's watermark then moves past it, that window is never
 * scanned again and the fill is lost for good.
 */

import type { Transaction } from "@/lib/types";

/** Candidates within this window of an existing row can be the same fill. */
const DEDUP_WINDOW_MS = 5 * 60 * 1000;
/**
 * Quantity tolerance for the duplicate match. Deliberately tight: a false
 * positive here silently drops a real fill, which is the same class of bug
 * the window change above fixes. A hand-entered row rounded to fewer decimals
 * will not match and gets imported as a visible duplicate — recoverable by
 * deleting a row, unlike a fill that never lands.
 */
const DEDUP_QTY_EPS = 1e-8;

export interface SyncPlan {
  /** New transactions to insert, oldest first. */
  toInsert: Transaction[];
  /** Candidates skipped because an existing row already covers them. */
  skippedDuplicates: Transaction[];
  /** Floor (epoch ms) of the window this plan covers; 0 when unbounded. */
  since: number;
}

const isDuplicate = (candidate: Transaction, existing: Transaction): boolean =>
  existing.coinId === candidate.coinId &&
  Math.abs(existing.date - candidate.date) <= DEDUP_WINDOW_MS &&
  Math.abs(existing.quantity - candidate.quantity) <= DEDUP_QTY_EPS;

export interface PlanSyncOptions {
  /**
   * Floor of the scanned window (epoch ms) — the caller's watermark. Candidates
   * before it are dropped as out-of-window noise. Defaults to 0: with no window
   * declared, dedup alone decides.
   */
  since?: number;
}

/**
 * Plan an append-only sync: drop candidates outside the scanned window, then
 * skip any that duplicate a row already in the ledger (same coin, date within
 * ±5 minutes, quantity within tolerance — the same fill entered by hand) or an
 * earlier candidate in the same batch. Re-running with the inserted result in
 * `existing` yields an empty plan, so the sync is idempotent.
 */
export const planSync = (
  existing: Transaction[],
  candidates: Transaction[],
  { since = 0 }: PlanSyncOptions = {},
): SyncPlan => {
  const toInsert: Transaction[] = [];
  const skippedDuplicates: Transaction[] = [];

  const ordered = [...candidates].sort((a, b) => a.date - b.date);
  for (const candidate of ordered) {
    if (candidate.date < since) continue;
    const dupe =
      existing.some((tx) => isDuplicate(candidate, tx)) ||
      toInsert.some((tx) => isDuplicate(candidate, tx));
    if (dupe) skippedDuplicates.push(candidate);
    else toInsert.push(candidate);
  }

  return { toInsert, skippedDuplicates, since };
};
