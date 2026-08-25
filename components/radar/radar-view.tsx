"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { RadarFilterDialog } from "@/components/radar/radar-filter-dialog";
import { RadarHud } from "@/components/radar/radar-hud";
import { RadarTable } from "@/components/radar/radar-table";
import { RadarToolbar } from "@/components/radar/radar-toolbar";
import { TradingViewChartDialog } from "@/components/radar/tradingview-chart-dialog";
import { ShareButton } from "@/components/share-button";
import { useMarkets } from "@/hooks/use-markets";
import { useCurrency } from "@/lib/currency";
import { download } from "@/lib/download";
import { radarToCsv } from "@/lib/radar-csv";
import { useWatchlist } from "@/lib/watchlist";
import {
  applyFilters,
  decodeRadarState,
  mergeRadarState,
  metricValue,
  radarEmptyMessage,
  type FilterCondition,
  type RadarSortKey,
  type RadarState,
} from "@/lib/radar";
import type { Coin } from "@/lib/types";

/**
 * The relative-strength screener — every coin's momentum measured against
 * Bitcoin (the "BTC vs Altcoins" view), filtered through one toolbar + modal,
 * with the whole state in the URL so any view is shareable.
 *
 * It renders as the Market screen's "Relative to BTC" lens (`embedded`), which
 * suppresses the header and HUD since the Market hero already carries the
 * global readings. The standalone branch is left from the retired /radar route.
 */
export const RadarView = ({
  embedded = false,
}: {
  embedded?: boolean;
} = {}): React.ReactNode => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currency } = useCurrency();
  const { ids: watchedIds } = useWatchlist();
  const { data, isLoading, isError, error } = useMarkets();

  const state = useMemo(() => decodeRadarState(searchParams), [searchParams]);

  const [chartCoin, setChartCoin] = useState<Coin | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (isError) {
      toast.error("Failed to load market data", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }, [isError, error]);

  // Write state to whatever path this view lives on — the Market screen ("/")
  // when embedded — so the relative lens never navigates away. Merged, not
  // encoded from scratch: the Market URL also carries `lens`, and dropping it
  // would kick the user back to the table on the next sort.
  const commit = useCallback(
    (next: RadarState): void => {
      const qs = mergeRadarState(searchParams, next);
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const btc = useMemo(() => data?.find((c) => c.id === "bitcoin"), [data]);

  // The watchlist narrows first, on its own, because the empty state has to
  // tell "nothing starred is in the top 100" apart from "your search matched
  // none of them" — one list can't answer both.
  const starred = useMemo(() => {
    if (!data) return [];
    return state.watchlist ? data.filter((c) => watchedIds.has(c.id)) : data;
  }, [data, state.watchlist, watchedIds]);

  // Search is matched here so the toolbar count and the table agree; the
  // metric conditions are applied on top in `rows`.
  const searched = useMemo(() => {
    const q = state.q.trim().toLowerCase();
    if (!q) return starred;
    return starred.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q),
    );
  }, [starred, state.q]);

  const rows = useMemo(() => {
    const filtered = applyFilters(searched, state.conditions, btc);
    const dir = state.sortDir === "asc" ? 1 : -1;
    if (state.sortKey === "rank") {
      return [...filtered].sort(
        (a, b) => (a.market_cap_rank - b.market_cap_rank) * dir,
      );
    }
    const key = state.sortKey;
    return [...filtered].sort((a, b) => {
      const av = metricValue(a, key, btc);
      const bv = metricValue(b, key, btc);
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av - bv) * dir;
    });
  }, [searched, state, btc]);

  const handleSort = (key: RadarSortKey): void => {
    if (key === state.sortKey) {
      commit({ ...state, sortDir: state.sortDir === "asc" ? "desc" : "asc" });
    } else {
      // Rank reads low→high; momentum reads high→low by default.
      commit({ ...state, sortKey: key, sortDir: key === "rank" ? "asc" : "desc" });
    }
  };

  const handleApplyFilters = (conditions: FilterCondition[]): void => {
    commit({ ...state, conditions });
  };

  const handleClear = (): void => {
    commit({ ...state, conditions: [] });
  };

  const emptyMessage = radarEmptyMessage({
    watchlist: state.watchlist,
    watchedCount: watchedIds.size,
    starredCount: starred.length,
    searchedCount: searched.length,
    query: state.q,
  });

  const handleExportCsv = (): void => {
    download(
      `hodl-relative-${currency}.csv`,
      radarToCsv(rows, btc, currency),
      "text/csv;charset=utf-8",
    );
  };

  return (
    <section className="space-y-5">
      {!embedded && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold">Radar</h1>
            <p className="text-sm text-muted-foreground">
              Relative strength across the top 100 — every move measured against
              Bitcoin. Screen by momentum and open any chart.
            </p>
          </div>
          <ShareButton title="Radar · HODL" />
        </div>
      )}

      {!embedded && <RadarHud />}

      <RadarToolbar
        q={state.q}
        onQChange={(q) => commit({ ...state, q })}
        conditions={state.conditions}
        onOpenFilters={() => setFiltersOpen(true)}
        onClear={handleClear}
        shownCount={rows.length}
        totalCount={searched.length}
        watchlist={state.watchlist}
        onWatchlistChange={(watchlist) => commit({ ...state, watchlist })}
        watchedCount={watchedIds.size}
        onExportCsv={handleExportCsv}
      />

      {/* The % columns are performance vs Bitcoin, so BTC itself reads 0. */}
      <p className="text-xs text-muted-foreground">
        % change is each coin&apos;s move <strong className="font-medium text-foreground">relative to Bitcoin</strong>{" "}
        over the period — Bitcoin is the 0% baseline.
      </p>

      <RadarTable
        rows={rows}
        btc={btc}
        currency={currency}
        sortKey={state.sortKey}
        sortDir={state.sortDir}
        onSort={handleSort}
        onOpenChart={setChartCoin}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
      />

      <RadarFilterDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        conditions={state.conditions}
        onApply={handleApplyFilters}
        onClear={handleClear}
      />

      <TradingViewChartDialog
        coin={chartCoin}
        onClose={() => setChartCoin(null)}
      />
    </section>
  );
};
