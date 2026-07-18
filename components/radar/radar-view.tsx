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
import {
  applyFilters,
  decodeRadarState,
  encodeRadarState,
  metricValue,
  type FilterCondition,
  type RadarSortKey,
  type RadarState,
} from "@/lib/radar";
import type { Coin } from "@/lib/types";

/**
 * The Radar screener: a market-context HUD over a dense relative-strength table
 * — every coin's momentum measured against Bitcoin (the "BTC vs Altcoins"
 * view). Filtering is consolidated behind one toolbar + modal, and the whole
 * state lives in the URL so any view is shareable.
 */
/**
 * The relative-strength screener. Standalone at /radar (with its own title +
 * HUD); when `embedded` (as the "Relative to BTC" lens inside the Market
 * screen) the header and HUD are suppressed, since the Market hero already
 * carries the global readings.
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

  // Write state to whatever path this view lives on — /radar standalone, or the
  // Market screen ("/") when embedded — so the relative lens never navigates away.
  const commit = useCallback(
    (next: RadarState): void => {
      const qs = encodeRadarState(next);
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, pathname],
  );

  const btc = useMemo(() => data?.find((c) => c.id === "bitcoin"), [data]);

  // Search is matched here so the toolbar count and the table agree.
  const searched = useMemo(() => {
    if (!data) return [];
    const q = state.q.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q),
    );
  }, [data, state.q]);

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

  return (
    <section className="space-y-5">
      {!embedded && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Radar</h1>
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
        totalCount={data?.length ?? 0}
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
