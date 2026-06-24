"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { fetchCoinTickers } from "@/lib/api";
import type { Ticker } from "@/lib/types";

/** Fetches the markets (exchanges) trading a coin. */
export const useCoinTickers = (id: string): UseQueryResult<Ticker[]> =>
  useQuery({
    queryKey: ["coin-tickers", id],
    queryFn: () => fetchCoinTickers(id),
    staleTime: 120_000,
  });
