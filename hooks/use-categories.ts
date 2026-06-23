"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { fetchCategories } from "@/lib/api";
import type { Category } from "@/lib/types";

/** Market sectors ordered by market cap. */
export const useCategories = (): UseQueryResult<Category[]> =>
  useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    refetchInterval: 300_000,
  });
