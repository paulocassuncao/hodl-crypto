"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { fetchTrending } from "@/lib/api";
import type { TrendingCoin } from "@/lib/types";

/** Currently trending coins. */
export const useTrending = (): UseQueryResult<TrendingCoin[]> =>
  useQuery({
    queryKey: ["trending"],
    queryFn: fetchTrending,
    refetchInterval: 120_000,
  });
