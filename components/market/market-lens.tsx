"use client";

import { useState } from "react";

import { Grid3x3, Table2, TrendingUp } from "lucide-react";

import { MarketHeatmap } from "@/components/heatmap/market-heatmap";
import { MarketTable } from "@/components/market-table/market-table";
import { RadarView } from "@/components/radar/radar-view";
import { cn } from "@/lib/utils";

type Lens = "table" | "relative" | "heatmap";

const LENSES: { id: Lens; label: string; icon: typeof Table2 }[] = [
  { id: "table", label: "Table", icon: Table2 },
  { id: "relative", label: "Relative to BTC", icon: TrendingUp },
  { id: "heatmap", label: "Heatmap", icon: Grid3x3 },
];

/**
 * The Market list, one dataset seen three ways. A single lens switch folds the
 * former Coins / Radar / Heatmap screens together: the sortable table, the
 * BTC-relative screener, and the treemap all read the same top-100 `useMarkets`
 * data. Lens choice is local (resets on reload); the relative lens keeps its own
 * URL state for sharable screens.
 */
export const MarketLens = (): React.ReactNode => {
  const [lens, setLens] = useState<Lens>("table");

  return (
    <section aria-label="Market" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold tracking-tight">Market</h2>
        <div
          role="tablist"
          aria-label="Market view"
          className="glass-panel inline-flex gap-1 rounded-xl p-1"
        >
          {LENSES.map(({ id, label, icon: Icon }) => {
            const active = lens === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setLens(id)}
                className={cn(
                  "focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-glass-high text-foreground shadow-[inset_0_0_0_1px_var(--glass-border)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {lens === "table" && <MarketTable />}
      {lens === "relative" && <RadarView embedded />}
      {lens === "heatmap" && <MarketHeatmap />}
    </section>
  );
};
