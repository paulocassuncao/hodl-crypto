"use client";

import { Badge } from "@/components/ui/badge";
import type { SleeveSignalEventRow } from "@/lib/supabase/types";

const formatDate = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const STRATEGY_LABEL: Record<SleeveSignalEventRow["strategy"], string> = {
  ema_trend: "EMA trend",
  donchian: "Donchian",
};

/**
 * Entry/exit pill matching the trades table's SideBadge: the literal text
 * carries the meaning, color and arrow only reinforce it.
 */
const FlipPill = ({ on }: { on: boolean }): React.ReactNode => (
  <span
    className={
      on
        ? "rounded bg-gain/15 px-1.5 py-0.5 text-xs font-medium text-gain-ink"
        : "rounded bg-loss/15 px-1.5 py-0.5 text-xs font-medium text-loss-ink"
    }
  >
    {on ? "▲ entry" : "▼ exit"}
  </span>
);

/**
 * Signal-flip log, newest first: when each sub-strategy turned and the
 * indicator condition that turned it. The flip decided at this bar's close
 * executes at the NEXT bar's open, so its trade (if any) is dated a day later.
 */
export const SleeveSignalFeed = ({
  events,
}: {
  events: SleeveSignalEventRow[];
}): React.ReactNode => {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        No signal flips recorded yet.
      </div>
    );
  }
  return (
    <div className="divide-y rounded-xl border bg-card">
      {events.map((e) => (
        <div key={e.id} className="space-y-1 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="whitespace-nowrap tabular-nums text-muted-foreground">
              {formatDate(e.time_ms)}
            </span>
            <span className="font-medium">{e.asset}</span>
            <Badge variant="outline">{STRATEGY_LABEL[e.strategy]}</Badge>
            <FlipPill on={e.signal_after === 1} />
          </div>
          <p className="text-muted-foreground">{e.reason}</p>
        </div>
      ))}
    </div>
  );
};
