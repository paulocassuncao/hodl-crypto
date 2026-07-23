import { NextResponse, type NextRequest } from "next/server";

import { buildBacktestReport, type BacktestPeriod } from "@/lib/backtest";
import { fetchDailyKlines } from "@/lib/binance";
import { handleRoute } from "@/lib/route";

/** Sleeve assets and their Binance symbols (BTC+ETH only — see handover §2). */
const SYMBOLS: Record<string, string> = { BTC: "BTCUSDT", ETH: "ETHUSDT" };
const DAY_MS = 86_400_000;
const YEAR_MS = 365 * DAY_MS;

const PERIOD_START_MS: Record<BacktestPeriod, (now: number) => number> = {
  "1y": (now) => now - YEAR_MS,
  "3y": (now) => now - 3 * YEAR_MS,
  "5y": (now) => now - 5 * YEAR_MS,
  max: () => 0,
};

/** Daily closed bars are immutable, so the report is safely cacheable. */
export const revalidate = 3600;

/**
 * Historical backtest of the deployed sleeve ensemble for one asset over a
 * preset period. Fetches Binance daily candles server-side (Binance is
 * geo-blocked from the browser) and returns a full {@link BacktestReport}.
 * Gated behind login by the app proxy like every other /api route.
 */
export const GET = async (request: NextRequest): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url);
  const asset = (searchParams.get("asset") ?? "").toUpperCase();
  const period = searchParams.get("period") as BacktestPeriod | null;

  // `Object.hasOwn`, not `in`/bracket-lookup: both walk the prototype chain, so
  // `?period=constructor` (or toString, valueOf, hasOwnProperty) used to pass
  // this guard and hand an Object.prototype method to PERIOD_START_MS below.
  if (!Object.hasOwn(SYMBOLS, asset)) {
    return NextResponse.json(
      { error: "asset must be BTC or ETH" },
      { status: 400 },
    );
  }
  if (!period || !Object.hasOwn(PERIOD_START_MS, period)) {
    return NextResponse.json(
      { error: "period must be 1y, 3y, 5y or max" },
      { status: 400 },
    );
  }
  const symbol = SYMBOLS[asset];

  return handleRoute(async () => {
    const startTimeMs = PERIOD_START_MS[period](Date.now());
    const candles = await fetchDailyKlines(symbol, { startTimeMs });
    return buildBacktestReport(asset, candles, period);
  });
};
