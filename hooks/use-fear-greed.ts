"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { fetchFearGreed } from "@/lib/api";
import type { FearGreed } from "@/lib/types";

/** Current Fear & Greed index reading. */
export const useFearGreed = (): UseQueryResult<FearGreed> =>
  useQuery({
    queryKey: ["fear-greed"],
    queryFn: fetchFearGreed,
    refetchInterval: 300_000,
  });
