"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { fetchDexPools } from "@/lib/api";
import type { Pool } from "@/lib/types";

/** Trending or new on-chain pools for a network (GeckoTerminal, auto-refresh). */
export const useDexPools = (
  network: string,
  mode: "trending" | "new",
): UseQueryResult<Pool[]> =>
  useQuery({
    queryKey: ["dex", network, mode],
    queryFn: () => fetchDexPools(network, mode),
    refetchInterval: 60_000,
  });
