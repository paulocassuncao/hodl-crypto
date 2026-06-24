"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { fetchNews } from "@/lib/api";
import type { NewsItem } from "@/lib/types";

/**
 * Aggregated crypto headlines. Pass a `{ symbol, name }` filter to scope the
 * feed to a single coin (e.g. on the coin detail page).
 */
export const useNews = (filter?: {
  symbol: string;
  name: string;
}): UseQueryResult<NewsItem[]> =>
  useQuery({
    queryKey: ["news", filter?.symbol ?? "all"],
    queryFn: () => fetchNews(filter),
    refetchInterval: 600_000,
  });
