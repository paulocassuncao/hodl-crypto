"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { BacktestView } from "@/components/backtest/backtest-view";
import { LensSwitch, type LensOption } from "@/components/lens-switch";
import { SleeveView } from "@/components/sleeve/sleeve-view";

type StrategyLens = "live" | "backtest";

const LENSES: LensOption<StrategyLens>[] = [
  { id: "live", label: "Live" },
  { id: "backtest", label: "Backtest" },
];

/** The lens the URL asks for; live when it asks for nothing or nonsense. */
const DEFAULT_LENS: StrategyLens = "live";

const isLens = (value: string | null): value is StrategyLens =>
  LENSES.some((l) => l.id === value);

/**
 * One strategy, two ways of looking at it. The same trend ensemble is running
 * forward on paper (Live) and simulated over past data (Backtest) — they were
 * two screens repeating the same parameters in two headers, which read as two
 * strategies. The shared header states the strategy once; each lens keeps only
 * the caveat that is actually its own.
 *
 * The lens lives in the URL (`?lens=`) — the same key the Market screen uses,
 * because it is the same control doing the same job — so a view survives a
 * reload and can be sent to someone.
 */
export const StrategyView = (): React.ReactNode => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get("lens");
  const lens: StrategyLens = isLens(raw) ? raw : DEFAULT_LENS;

  const setLens = (next: StrategyLens): void => {
    const params = new URLSearchParams(searchParams);
    // The default stays off the URL so the screen keeps its clean address.
    if (next === DEFAULT_LENS) params.delete("lens");
    else params.set("lens", next);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-semibold">Strategy</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            A systematic trend ensemble — EMA 20/50/200 + Donchian 20/10, vol
            target 0.6 — on fictitious capital. Never counted in your net worth.
          </p>
        </div>
        <LensSwitch
          value={lens}
          options={LENSES}
          onChange={setLens}
          ariaLabel="Strategy view"
          alwaysShowLabels
        />
      </div>

      {/* A min-height frame so switching lenses never collapses the page and
          yanks the scroll to the top. */}
      <div className="min-h-[70vh]">
        {lens === "live" ? <SleeveView /> : <BacktestView />}
      </div>
    </div>
  );
};
