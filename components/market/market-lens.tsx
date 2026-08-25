"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Grid3x3, Layers, Table2, TrendingUp } from "lucide-react";

import { CategoriesTable } from "@/components/categories-table";
import { MarketHeatmap } from "@/components/heatmap/market-heatmap";
import { MarketTable } from "@/components/market-table/market-table";
import { RadarView } from "@/components/radar/radar-view";
import { cn } from "@/lib/utils";

type Lens = "table" | "relative" | "heatmap" | "sectors";

const LENSES: { id: Lens; label: string; icon: typeof Table2 }[] = [
  { id: "table", label: "Table", icon: Table2 },
  { id: "relative", label: "Relative to BTC", icon: TrendingUp },
  { id: "heatmap", label: "Heatmap", icon: Grid3x3 },
  { id: "sectors", label: "Sectors", icon: Layers },
];

/** The lens the URL asks for; the table when it asks for nothing or nonsense. */
const DEFAULT_LENS: Lens = "table";

const isLens = (value: string | null): value is Lens =>
  LENSES.some((l) => l.id === value);

/**
 * The Market list, one place, several ways. A single lens switch folds the
 * former Coins / Radar / Heatmap / Categories screens together: the sortable
 * table, the BTC-relative screener, and the treemap all read the same top-100
 * `useMarkets` data; Sectors is the market by category. The lens lives in the
 * URL (`?lens=`), so a view survives a reload and can be sent to someone —
 * the relative lens's own filters ride in the same query string. The content
 * sits in a min-height frame so switching lenses never collapses the page
 * height and yanks the scroll to the top.
 */
export const MarketLens = (): React.ReactNode => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get("lens");
  const lens: Lens = isLens(raw) ? raw : DEFAULT_LENS;

  const setLens = (next: Lens): void => {
    const params = new URLSearchParams(searchParams);
    // The default stays off the URL so the home address keeps its clean form.
    if (next === DEFAULT_LENS) params.delete("lens");
    else params.set("lens", next);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  return (
    <section aria-label="Market" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold tracking-tight">
          Market
        </h2>
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

      <div className="min-h-[70vh]">
        {lens === "table" && <MarketTable />}
        {lens === "relative" && <RadarView embedded />}
        {lens === "heatmap" && <MarketHeatmap />}
        {lens === "sectors" && <CategoriesTable />}
      </div>
    </section>
  );
};
