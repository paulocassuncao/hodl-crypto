"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { fetchCoinChart } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import type { ChartPoint } from "@/lib/types";

/** Historical price series for a coin over `days`, in the active currency. */
export const useCoinChart = (
  id: string,
  days: number,
): UseQueryResult<ChartPoint[]> => {
  const { currency } = useCurrency();
  return useQuery({
    queryKey: ["coin-chart", id, days, currency],
    queryFn: () => fetchCoinChart(id, days, currency),
  });
};
