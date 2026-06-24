"use client";

import { useQueries, type UseQueryResult } from "@tanstack/react-query";

import { fetchCoinChart } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import type { ChartPoint } from "@/lib/types";

/** Fetches historical price series for several coins in parallel. */
export const useCoinCharts = (
  ids: string[],
  days: number,
): UseQueryResult<ChartPoint[]>[] => {
  const { currency } = useCurrency();
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: ["coin-chart", id, days, currency],
      queryFn: () => fetchCoinChart(id, days, currency),
    })),
  });
};
