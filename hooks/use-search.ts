"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { searchCoins } from "@/lib/api";
import type { SearchCoin } from "@/lib/types";

/** Coin search results for a query (disabled below 2 characters). */
export const useSearch = (query: string): UseQueryResult<SearchCoin[]> =>
  useQuery({
    queryKey: ["search", query],
    queryFn: () => searchCoins(query),
    enabled: query.trim().length >= 2,
    staleTime: 60_000,
  });
