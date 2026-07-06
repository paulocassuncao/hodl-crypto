"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  SleeveEquityRow,
  SleeveSignalEventRow,
  SleeveStateRow,
  SleeveTradeRow,
} from "@/lib/supabase/types";

export interface SleeveData {
  states: SleeveStateRow[];
  trades: SleeveTradeRow[];
  equity: SleeveEquityRow[];
}

/**
 * The signed-in user's sleeve rows (state, trades, forward equity curve),
 * read directly through the RLS-scoped browser client — the sleeve is
 * written server-side by the daily cron, so the UI only ever reads.
 */
export const useSleeve = (): UseQueryResult<SleeveData> =>
  useQuery({
    queryKey: ["sleeve"],
    queryFn: async (): Promise<SleeveData> => {
      const supabase = getSupabaseBrowserClient();
      const [states, trades, equity] = await Promise.all([
        supabase.from("sleeve_state").select("*").order("asset"),
        supabase
          .from("sleeve_trades")
          .select("*")
          .order("time_ms", { ascending: false }),
        supabase
          .from("sleeve_equity")
          .select("*")
          .order("time_ms", { ascending: true }),
      ]);
      for (const res of [states, trades, equity]) {
        if (res.error) throw new Error(res.error.message);
      }
      return {
        states: states.data ?? [],
        trades: trades.data ?? [],
        equity: equity.data ?? [],
      };
    },
    staleTime: 60_000,
  });

/**
 * The signed-in user's sleeve signal-flip events, newest first. Written by
 * the daily cron, so a 5-minute refetch is plenty; shared by the sleeve page
 * and the app-wide signal watcher (React Query dedupes the fetch).
 */
export const useSleeveSignalEvents = (): UseQueryResult<
  SleeveSignalEventRow[]
> =>
  useQuery({
    queryKey: ["sleeve-signal-events"],
    queryFn: async (): Promise<SleeveSignalEventRow[]> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("sleeve_signal_events")
        .select("*")
        .order("time_ms", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 60_000,
    refetchInterval: 300_000,
  });
