"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { fetchCoin } from "@/lib/api";
import type { CoinDetail } from "@/lib/types";

/** Detailed data for a single coin by id. */
export const useCoin = (id: string): UseQueryResult<CoinDetail> =>
  useQuery({
    queryKey: ["coin", id],
    queryFn: () => fetchCoin(id),
  });
