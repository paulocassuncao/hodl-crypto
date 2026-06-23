"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { fetchGlobal } from "@/lib/api";
import type { GlobalData } from "@/lib/types";

/** Global market stats, auto-refreshed every 60s. */
export const useGlobal = (): UseQueryResult<GlobalData> =>
  useQuery({
    queryKey: ["global"],
    queryFn: fetchGlobal,
    refetchInterval: 60_000,
  });
