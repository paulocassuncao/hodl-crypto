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

    // Empty-ledger floor: the DCA program started 2026-02-02; scanning from
    // the epoch would mean thousands of 7-day windows against Bybit.
    const DCA_START_MS = Date.parse("2026-02-02T00:00:00Z");
    const fills = await fetchSpotBuys({
      // Overlap the cutoff by a minute so a fill recorded milliseconds after
      // the last row isn't missed; planSync drops anything ≤ cutoff.
      startTime: existing.length
        ? Math.max(...existing.map((t) => t.date)) - 60_000
        : DCA_START_MS,
    });
    const candidates = fills.map(fillToTransaction);
    const plan = planSync(existing, candidates);

    if (plan.toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("transactions")
        .insert(plan.toInsert.map((tx) => toRow(tx, user.id)));
      if (insertError) throw new Error(insertError.message);
    }

    return {
      inserted: plan.toInsert.length,
      skipped: plan.skippedDuplicates.length,
      cutoff: plan.cutoff,
    };
  });
};
