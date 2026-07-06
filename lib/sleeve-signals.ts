/**
 * Pure client-side helpers for sleeve signal events: joining events onto
 * trades (attribution) and splitting "fresh" events for the notification
 * watcher. Kept free of React/IO so they unit-test directly.
 */

import type { SleeveSignalEventRow } from "@/lib/supabase/types";

const DAY_MS = 86_400_000;

/** Watermark localStorage key: max event `time_ms` already shown to the user. */
export const SIGNALS_SEEN_KEY = "hodl:sleeve-signals-seen";

/**
 * Why a trade happened: a trade executed at bar `t` was decided at bar
 * `t − 1 day`, so it matches signal events at `(asset, time_ms − DAY_MS)`.
 * Multiple strategies flipping on the same bar are joined with " · ".
 * A trade inside the asset's event-coverage window with no flip is a
 * vol-resize/rebalance; a trade from before coverage returns null ("—").
 */
export const reasonForTrade = (
  trade: { asset: string; time_ms: number },
  events: SleeveSignalEventRow[],
): string | null => {
  const decisionMs = trade.time_ms - DAY_MS;
  const matches = events
    .filter((e) => e.asset === trade.asset && e.time_ms === decisionMs)
    .sort((a, b) => a.strategy.localeCompare(b.strategy));
  if (matches.length > 0) return matches.map((e) => e.reason).join(" · ");

  const assetEvents = events.filter((e) => e.asset === trade.asset);
  if (assetEvents.length === 0) return null;
  const oldest = Math.min(...assetEvents.map((e) => e.time_ms));
  return decisionMs >= oldest ? "Vol resize / rebalance" : null;
};

/**
 * Split events into the ones the user has not seen yet. A `null` watermark
 * means "first ever load": nothing is fresh (no toast flood of backfilled
 * history) and the watermark jumps to the newest event. Fresh events are
 * returned oldest-first so notifications read chronologically.
 */
export const splitFreshEvents = (
  events: SleeveSignalEventRow[],
  seenMs: number | null,
): { fresh: SleeveSignalEventRow[]; watermark: number | null } => {
  if (events.length === 0) return { fresh: [], watermark: seenMs };
  const maxMs = Math.max(...events.map((e) => e.time_ms));
  if (seenMs === null) return { fresh: [], watermark: maxMs };
  const fresh = events
    .filter((e) => e.time_ms > seenMs)
    .sort((a, b) => a.time_ms - b.time_ms);
  return { fresh, watermark: Math.max(seenMs, maxMs) };
};
