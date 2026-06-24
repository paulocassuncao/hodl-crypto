"use client";

import { useQueries, type UseQueryResult } from "@tanstack/react-query";

import { fetchCoin } from "@/lib/api";
import type { CoinDetail } from "@/lib/types";

/** Fetches detailed data for several coins in parallel. */
export const useCoins = (ids: string[]): UseQueryResult<CoinDetail>[] =>
  useQueries({
    queries: ids.map((id) => ({
      queryKey: ["coin", id],
      queryFn: () => fetchCoin(id),
    })),
  });
