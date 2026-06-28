"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";

import { CoinPicker, type PickerCoin } from "@/components/compare/coin-picker";
import { CompareStats } from "@/components/compare/compare-stats";
import { ShareButton } from "@/components/share-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCoins } from "@/hooks/use-coins";
import { MAX_COMPARE } from "@/lib/compare";

// Defer recharts so the picker and stats render first; the chart loads its own
// chunk behind a height-matched skeleton (no layout shift on swap-in).
const CompareChart = dynamic(
  () => import("@/components/compare/compare-chart").then((m) => m.CompareChart),
  { ssr: false, loading: () => <Skeleton className="h-[340px] w-full" /> },
);

const DEFAULT_IDS = ["bitcoin", "ethereum"];

const parseIds = (raw: string | null): string[] => {
  if (!raw) return DEFAULT_IDS;
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPARE);
  return ids.length > 0 ? ids : DEFAULT_IDS;
};

/** Coin comparison: pick 1–4 coins, see a normalized chart + stats grid. */
export const CompareView = (): React.ReactNode => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ids = parseIds(searchParams.get("ids"));

  // Shares query keys with the children, so this adds no extra requests; used
  // here only to label the picker chips and chart legend.
  const coinQueries = useCoins(ids);
  const coins: PickerCoin[] = ids.map((id, i) => {
    const data = coinQueries[i]?.data;
    return { id, symbol: data?.symbol ?? id, name: data?.name ?? id };
  });

  const setIds = useCallback(
    (next: string[]): void => {
      const params = new URLSearchParams();
      if (next.length > 0) params.set("ids", next.join(","));
      router.replace(`/compare${params.toString() ? `?${params}` : ""}`, {
        scroll: false,
      });
    },
    [router],
  );

  const handleAdd = (coin: PickerCoin): void => {
    if (ids.includes(coin.id) || ids.length >= MAX_COMPARE) return;
    setIds([...ids, coin.id]);
  };

  const handleRemove = (id: string): void => {
    setIds(ids.filter((x) => x !== id));
  };

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Compare Coins</h1>
          <p className="text-sm text-muted-foreground">
            Up to {MAX_COMPARE} coins, side by side. Chart is normalized to %
            change so different prices are comparable.
          </p>
        </div>
        <ShareButton title="Compare coins · HODL" />
      </div>

      <CoinPicker selected={coins} onAdd={handleAdd} onRemove={handleRemove} />

      {coins.length === 0 ? (
        <div className="rounded-lg border bg-card p-10 text-center text-muted-foreground">
          Add a coin to start comparing.
        </div>
      ) : (
        <>
          <CompareChart coins={coins.map((c) => ({ id: c.id, symbol: c.symbol }))} />
          <CompareStats ids={ids} />
        </>
      )}
    </section>
  );
};
