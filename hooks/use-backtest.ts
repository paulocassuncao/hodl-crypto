"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import type { BacktestPeriod, BacktestReport } from "@/lib/backtest";

export type BacktestAsset = "BTC" | "ETH";

/**
 * Historical backtest report for one asset + period, computed server-side from
 * Binance candles. Past data is immutable, so the result never goes stale.
 */
export const useBacktest = (
  asset: BacktestAsset,
  period: BacktestPeriod,
): UseQueryResult<BacktestReport> =>
  useQuery({
    queryKey: ["backtest", asset, period],
    queryFn: async (): Promise<BacktestReport> => {
      const res = await fetch(
        `/api/backtest/run?asset=${asset}&period=${period}`,
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? `Backtest failed (${res.status})`);
      }
      return res.json() as Promise<BacktestReport>;
    },
    staleTime: Infinity,
  });
