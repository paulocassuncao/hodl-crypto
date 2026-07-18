"use client";

import { Badge } from "@/components/ui/badge";

/** Minimal shape a signal-flip row needs, agnostic of its source. */
export interface SignalFeedItem {
  key: string;
  timeMs: number;
  asset: string;
  strategy: "ema_trend" | "donchian";
  /** Raw signal after the flip (1 = entry, 0 = exit). */
  signalAfter: number;
  reason: string;
}

const formatDate = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const STRATEGY_LABEL: Record<SignalFeedItem["strategy"], string> = {
  ema_trend: "EMA trend",
  donchian: "Donchian",
};

/**
 * Entry/exit pill: the literal text carries the meaning, color and arrow only
 * reinforce it (never color alone).
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
 * indicator condition that turned it. Shared by the live sleeve feed and the
 * historical backtest feed — the caller maps its rows into {@link SignalFeedItem}.
 */
export const SignalFeed = ({
  items,
  emptyLabel = "No signal flips recorded yet.",
}: {
  items: SignalFeedItem[];
  emptyLabel?: string;
}): React.ReactNode => {
  if (items.length === 0) {
    return (
      <div className="rounded-lg glass-panel p-6 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="divide-y rounded-xl glass-panel">
      {items.map((e) => (
        <div key={e.key} className="space-y-1 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="whitespace-nowrap tabular-nums text-muted-foreground">
              {formatDate(e.timeMs)}
            </span>
            <span className="font-medium">{e.asset}</span>
            <Badge variant="outline">{STRATEGY_LABEL[e.strategy]}</Badge>
            <FlipPill on={e.signalAfter === 1} />
          </div>
          <p className="text-muted-foreground">{e.reason}</p>
        </div>
      ))}
    </div>
  );
};
