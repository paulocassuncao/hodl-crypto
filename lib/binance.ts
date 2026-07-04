/**
 * Public Binance daily klines for the sleeve's strategy input (no API key).
 * Tries `data-api.binance.vision` first, then `api.binance.com` (geo-block
 * fallback). Runtime data must be fresh, so requests bypass the Next cache.
 */

import type { Candle } from "@/lib/strategy/types";

const HOSTS = ["https://data-api.binance.vision", "https://api.binance.com"];
const DAY_MS = 86_400_000;

/** Raw kline row: [openTime, open, high, low, close, volume, ...]. */
type KlineRow = [number, string, string, string, string, string, ...unknown[]];

const getKlines = async (
  symbol: string,
  startTimeMs: number,
  limit: number,
): Promise<KlineRow[]> => {
  let lastError: Error | null = null;
  for (const host of HOSTS) {
    try {
      const res = await fetch(
        `${host}/api/v3/klines?symbol=${symbol}&interval=1d&startTime=${startTimeMs}&limit=${limit}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`Binance ${host} responded ${res.status}`);
      return (await res.json()) as KlineRow[];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError ?? new Error("Binance klines unavailable");
};

/**
 * Daily candles for `symbol` (e.g. "BTCUSDT") from `startTimeMs`, oldest
 * first, paginated forward until fewer than a full page arrives.
 */
export const fetchDailyKlines = async (
  symbol: string,
  { startTimeMs, limit = 1000 }: { startTimeMs: number; limit?: number },
): Promise<Candle[]> => {
  const candles: Candle[] = [];
  let from = startTimeMs;
  for (;;) {
    const rows = await getKlines(symbol, from, limit);
    if (rows.length === 0) break;
    for (const [timeMs, open, high, low, close, volume] of rows) {
      candles.push({
        timeMs,
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
        volume: Number(volume),
      });
    }
    if (rows.length < limit) break;
    from = rows[rows.length - 1][0] + DAY_MS;
  }
  return candles;
};
