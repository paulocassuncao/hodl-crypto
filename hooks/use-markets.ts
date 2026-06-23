"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { fetchMarkets } from "@/lib/api";
import { useCurrency } from "@/lib/currency";
import type { Coin } from "@/lib/types";

/** Top 100 coins for the active currency, auto-refreshed every 60s. */
export const useMarkets = (): UseQueryResult<Coin[]> => {
  const { currency } = useCurrency();
  return useQuery({
    queryKey: ["markets", currency],
    queryFn: () => fetchMarkets(currency),
    refetchInterval: 60_000,
  });
};
