import type { ChartPoint } from "@/lib/types";

/** Max number of coins that can be compared at once. */
export const MAX_COMPARE = 4;

/** Line colors for compared coins, by selection order. */
export const COMPARE_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ec4899"];

/** Convert a price series to percentage change from its first point. */
export const normalizeSeries = (points: ChartPoint[]): number[] => {
  if (points.length === 0) return [];
  const base = points[0].price;
  if (!base) return points.map(() => 0);
  return points.map((p) => (p.price / base - 1) * 100);
};

export interface CompareDatum {
  time: number;
  [coinId: string]: number;
}

/**
 * Merge multiple price series into one dataset of normalized (% from start)
 * values for an overlaid chart. Series are aligned by index up to the
 * shortest length (all share the same time range/granularity).
 */
export const buildCompareData = (
  series: { id: string; points: ChartPoint[] }[],
): CompareDatum[] => {
  const active = series.filter((s) => s.points.length > 0);
  if (active.length === 0) return [];

  const len = Math.min(...active.map((s) => s.points.length));
  const normalized = active.map((s) => ({
    id: s.id,
    values: normalizeSeries(s.points),
  }));
  const times = active[0].points;

  const out: CompareDatum[] = [];
  for (let i = 0; i < len; i++) {
    const row: CompareDatum = { time: times[i].time };
    for (const n of normalized) row[n.id] = n.values[i];
    out.push(row);
  }
  return out;
};
