"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Grid3x3, Layers, Table2, TrendingUp } from "lucide-react";

import { CategoriesTable } from "@/components/categories-table";
import { MarketHeatmap } from "@/components/heatmap/market-heatmap";
import { LensSwitch, type LensOption } from "@/components/lens-switch";
import { MarketTable } from "@/components/market-table/market-table";
import { RadarView } from "@/components/radar/radar-view";
import { stripRadarState } from "@/lib/radar";

type Lens = "table" | "relative" | "heatmap" | "sectors";

const LENSES: LensOption<Lens>[] = [
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
    // The relative lens owns f/sort/dir/q/w. Leaving them behind would dirty
    // the home address and hand out links whose filters silently do nothing.
    if (next !== "relative") stripRadarState(params);
    // The default stays off the URL so the home address keeps its clean form.
    if (next === DEFAULT_LENS) params.delete("lens");
    else params.set("lens", next);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  return (
    <section aria-label="Market" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold tracking-tight">Market</h2>
        <LensSwitch
          value={lens}
          options={LENSES}
          onChange={setLens}
          ariaLabel="Market view"
        />
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
