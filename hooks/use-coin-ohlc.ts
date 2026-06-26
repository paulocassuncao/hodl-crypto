"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { fetchCoinOhlc } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import type { OHLCPoint } from "@/lib/types";

/** OHLC candle series for a coin over `days`, in the active currency. */
export const useCoinOhlc = (
  id: string,
  days: number,
): UseQueryResult<OHLCPoint[]> => {
  const { currency } = useCurrency();
  return useQuery({
    queryKey: ["coin-ohlc", id, days, currency],
    queryFn: () => fetchCoinOhlc(id, days, currency),
  });
};
