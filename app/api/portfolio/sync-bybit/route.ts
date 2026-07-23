import { NextResponse } from "next/server";

import { fetchSpotBuys, fillToTransaction } from "@/lib/bybit";
import { planSync } from "@/lib/bybit-sync";
import { handleRoute } from "@/lib/route";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toRow, toTransaction } from "@/lib/supabase/types";

/**
 * POST /api/portfolio/sync-bybit — append-only import of new Bybit spot Buy
 * executions into the signed-in user's transaction ledger.
 *
 * Fetches executions after the ledger's latest date, skips ones that already
 * exist (manual entry safety net), and INSERTs the rest tagged
 * `source: 'bybit'`. Never updates or deletes existing rows — the ledger is
 * the source of truth (see HODL-HANDOVER.md §6). Idempotent: re-running
 * inserts nothing new. Bybit keys stay server-side (lib/bybit.ts).
 */

/**
 * A first backfill scans months of 7-day windows across six pairs; give it
 * room to finish, because a timeout leaves the watermark unwritten and the
 * next attempt starts the whole scan over.
 */
export const maxDuration = 60;
export const POST = async (): Promise<NextResponse> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  return handleRoute(async () => {
    const { data, error } = await supabase.from("transactions").select("*");
    if (error) throw new Error(error.message);
    const existing = (data ?? []).map(toTransaction);

    // Per-user watermark: the upper bound of the last scanned Bybit range.
    // Scanning from here (not from the ledger's latest date) decouples the
    // window from ledger contents, so the February DCA buys — which never
    // appear in Bybit's spot execution API and so never advance the ledger's
    // Bybit-sourced max — stop anchoring every sync back to February, and the
    // window can't grow unbounded. Never reads the ledger to prune it: the
    // sync stays append-only and existing rows (Feb included) are untouched.
    const { data: syncRow, error: syncError } = await supabase
      .from("bybit_sync_state")
      .select("last_synced_ms")
      .maybeSingle();
    if (syncError) throw new Error(syncError.message);

    // First-run floor: the DCA program started 2026-02-02; scanning from the
    // epoch would mean thousands of 7-day windows against Bybit. This full
    // backfill runs once, after which the watermark bounds every later scan.
    const DCA_START_MS = Date.parse("2026-02-02T00:00:00Z");
    // Overlap by a minute so a fill recorded milliseconds after the bound
    // isn't missed; planSync drops ≤ cutoff and dedups the re-fetched overlap.
    const OVERLAP_MS = 60_000;
    const endTime = Date.now();
    const startTime = syncRow
      ? syncRow.last_synced_ms - OVERLAP_MS
      : existing.length
        ? Math.max(...existing.map((t) => t.date)) - OVERLAP_MS
        : DCA_START_MS;

    const fills = await fetchSpotBuys({ startTime, endTime });
    const candidates = fills.map(fillToTransaction);
    // The scanned window is what bounds the import — NOT the ledger's latest
    // date. A DCA row dated after a real Bybit fill used to drop that fill,
    // and the watermark below then moved past it for good. Dedup against the
    // existing rows is what keeps the re-scanned overlap from doubling up.
    const plan = planSync(existing, candidates, { since: startTime });

    if (plan.toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("transactions")
        .insert(plan.toInsert.map((tx) => toRow(tx, user.id)));
      if (insertError) throw new Error(insertError.message);
    }

    // Advance the watermark to this scan's upper bound even when nothing was
    // inserted — that empty-result case is exactly what would otherwise keep
    // rescanning from February on every click.
    const { error: watermarkError } = await supabase
      .from("bybit_sync_state")
      .upsert({ user_id: user.id, last_synced_ms: endTime });
    if (watermarkError) throw new Error(watermarkError.message);

    return {
      inserted: plan.toInsert.length,
      skipped: plan.skippedDuplicates.length,
      scannedFrom: plan.since,
      scannedTo: endTime,
    };
  });
};
