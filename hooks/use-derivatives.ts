"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { fetchDerivatives } from "@/lib/api";
import type { Derivative } from "@/lib/types";

/** Top derivatives tickers by open interest (CoinGecko, auto-refresh). */
export const useDerivatives = (): UseQueryResult<Derivative[]> =>
  useQuery({
    queryKey: ["derivatives"],
    queryFn: fetchDerivatives,
    refetchInterval: 60_000,
  });
