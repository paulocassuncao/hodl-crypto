import { NextResponse, type NextRequest } from "next/server";

import { fetchDailyKlines } from "@/lib/binance";
import { handleRoute } from "@/lib/route";
import {
  advanceSleeve,
  initSleeveState,
  type SleeveState,
} from "@/lib/sleeve";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { SleeveStateRow } from "@/lib/supabase/types";

/** Sleeve assets and their Binance symbols (BTC+ETH only — see handover §2). */
const ASSETS: Record<string, string> = { BTC: "BTCUSDT", ETH: "ETHUSDT" };
const DAY_MS = 86_400_000;
/** Fetch ~400 daily bars: enough for the 200-bar warm-up plus margin. */
const LOOKBACK_BARS = 400;
/** Fictitious capital per asset ($1000 total across BTC+ETH). */
const ALLOCATION = 500;
const TARGET_VOL = 0.6;

const toState = (row: SleeveStateRow): SleeveState => ({
  asset: row.asset,
  cash: row.cash,
  units: row.units,
  position: row.position,
  lastTimeMs: row.last_time_ms,
  allocation: row.allocation,
  targetVol: row.target_vol,
});

const toStateRow = (state: SleeveState, userId: string): SleeveStateRow => ({
  user_id: userId,
  asset: state.asset,
  cash: state.cash,
  units: state.units,
  position: state.position,
  last_time_ms: state.lastTimeMs,
  allocation: state.allocation,
  target_vol: state.targetVol,
});

/**
 * Advance the paper sleeve one run: for each asset, fetch recent daily
 * candles, bootstrap the state in cash on first run, then apply the paper
 * execution to every newly-closed bar and persist trades/equity/state.
 * Idempotent — a second call in the same day processes zero bars. Invoked by
 * the daily Vercel Cron (GET) or manually (POST), both gated by CRON_SECRET.
 */
const run = async (request: NextRequest): Promise<NextResponse> => {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownerId = process.env.SLEEVE_OWNER_USER_ID;
  if (!ownerId)
    return NextResponse.json(
      { error: "SLEEVE_OWNER_USER_ID not set" },
      { status: 500 },
    );

  return handleRoute(async () => {
    const supabase = createSupabaseServiceClient();
    const nowMs = Date.now();
    const perAsset: Record<
      string,
      { barsProcessed: number; trades: number; lastTimeMs: number }
    > = {};

    for (const [asset, symbol] of Object.entries(ASSETS)) {
      const candles = await fetchDailyKlines(symbol, {
        startTimeMs: nowMs - LOOKBACK_BARS * DAY_MS,
      });

      const { data: stateRow, error: stateError } = await supabase
        .from("sleeve_state")
        .select("*")
        .eq("user_id", ownerId)
        .eq("asset", asset)
        .maybeSingle();
      if (stateError) throw new Error(stateError.message);

      if (!stateRow) {
        // First run: bootstrap in cash anchored to the latest closed bar.
        const state = initSleeveState(asset, candles, nowMs, {
          allocation: ALLOCATION,
          targetVol: TARGET_VOL,
        });
        const { error } = await supabase
          .from("sleeve_state")
          .insert(toStateRow(state, ownerId));
        if (error) throw new Error(error.message);
        perAsset[asset] = {
          barsProcessed: 0,
          trades: 0,
          lastTimeMs: state.lastTimeMs,
        };
        continue;
      }

      const advance = advanceSleeve(toState(stateRow), candles, nowMs);
      if (advance.barsProcessed > 0) {
        if (advance.newTrades.length > 0) {
          const { error } = await supabase.from("sleeve_trades").insert(
            advance.newTrades.map((t) => ({
              user_id: ownerId,
              asset: t.asset,
              time_ms: t.timeMs,
              side: t.side,
              price: t.price,
              units: t.units,
              position_after: t.positionAfter,
              equity_after: t.equityAfter,
            })),
          );
          if (error) throw new Error(error.message);
        }
        // Upsert on (user_id, asset, time_ms): second idempotency belt in
        // case a previous run wrote equity but failed before the state write.
        const { error: equityError } = await supabase
          .from("sleeve_equity")
          .upsert(
            advance.newEquityPoints.map((p) => ({
              user_id: ownerId,
              asset: p.asset,
              time_ms: p.timeMs,
              equity: p.equity,
            })),
          );
        if (equityError) throw new Error(equityError.message);
        const { error: updateError } = await supabase
          .from("sleeve_state")
          .update(toStateRow(advance.state, ownerId))
          .eq("user_id", ownerId)
          .eq("asset", asset);
        if (updateError) throw new Error(updateError.message);
      }
      perAsset[asset] = {
        barsProcessed: advance.barsProcessed,
        trades: advance.newTrades.length,
        lastTimeMs: advance.state.lastTimeMs,
      };
    }

    return { perAsset };
  });
};

/** Vercel Cron invokes GET with `Authorization: Bearer $CRON_SECRET`. */
export const GET = run;
export const POST = run;
