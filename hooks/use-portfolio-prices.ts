"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { fetchPortfolioPrices } from "@/lib/api";
import type { PriceMap } from "@/lib/portfolio-core";

/**
 * USD prices + 24h change for a set of coin ids. The query key is the sorted
 * id list so adding/removing a holding refetches; auto-refreshes every 60s.
 */
export const usePortfolioPrices = (
  ids: string[],
): UseQueryResult<PriceMap> => {
  const sorted = [...ids].sort();
  return useQuery({
    queryKey: ["portfolio-prices", sorted],
    queryFn: () => fetchPortfolioPrices(sorted),
    enabled: sorted.length > 0,
    refetchInterval: 60_000,
  });
};
