"use client";

import { useEffect, useState } from "react";

import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DataFreshnessProps {
  /** Epoch-ms of the last successful fetch (React Query's `dataUpdatedAt`). */
  updatedAt: number | undefined;
  /** True while a background refetch is in flight. */
  isFetching?: boolean;
  className?: string;
}

/**
 * A terse "· updated 12s ago" status line for auto-refreshed data. It ticks on
 * its own every 10s so a stale refresh never masquerades as live data
 * (PRODUCT.md principle #4: show data freshness truthfully). The dot stays
 * neutral — "live" is carried by the pulse while fetching, not by color, so it
 * doesn't borrow the reserved gain/loss channels. `aria-live="polite"` lets a
 * screen reader announce the refresh without stealing focus.
 */
export const DataFreshness = ({
  updatedAt,
  isFetching = false,
  className,
}: DataFreshnessProps): React.ReactNode => {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  if (updatedAt == null || updatedAt === 0) return null;

  const rel = formatRelativeTime(updatedAt);
  const label = rel === "now" ? "updated just now" : `updated ${rel} ago`;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        className,
      )}
      aria-live="polite"
    >
      <span
        className={cn(
          "size-1.5 rounded-full bg-muted-foreground",
          isFetching && "motion-safe:animate-pulse",
        )}
        aria-hidden
      />
      <span className="tabular-nums">{label}</span>
    </div>
  );
};
