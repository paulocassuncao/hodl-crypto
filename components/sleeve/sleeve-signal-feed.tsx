"use client";

import { SignalFeed, type SignalFeedItem } from "@/components/signal-feed";
import type { SleeveSignalEventRow } from "@/lib/supabase/types";

const toItem = (e: SleeveSignalEventRow): SignalFeedItem => ({
  key: e.id,
  timeMs: e.time_ms,
  asset: e.asset,
  strategy: e.strategy,
  signalAfter: e.signal_after,
  reason: e.reason,
});

/**
 * Live sleeve signal-flip log — thin adapter over the shared {@link SignalFeed}.
 * The flip decided at this bar's close executes at the NEXT bar's open, so its
 * trade (if any) is dated a day later.
 */
export const SleeveSignalFeed = ({
  events,
}: {
  events: SleeveSignalEventRow[];
}): React.ReactNode => <SignalFeed items={events.map(toItem)} />;
