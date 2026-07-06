"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { SleeveStateRow } from "@/lib/supabase/types";

const formatDate = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

/**
 * ON/OFF state pill: the literal text carries the meaning, the arrow and
 * color only reinforce it (never color alone — WCAG).
 */
const SignalPill = ({ on }: { on: boolean }): React.ReactNode => (
  <span
    className={
      on
        ? "rounded bg-gain/15 px-1.5 py-0.5 text-xs font-medium text-gain-ink"
        : "rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
    }
  >
    {on ? "▲ on" : "▼ off"}
  </span>
);

const Row = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactNode => (
  <div className="flex items-baseline justify-between gap-2">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right tabular-nums">{children}</span>
  </div>
);

/** "$68,412" or an honest em dash while the indicator warms up. */
const money = (value: number | null): string =>
  value === null ? "—" : formatCurrency(value, "usd");

/**
 * Per-asset signal status: what each sub-strategy currently says and the
 * indicator values behind it, read from the snapshot the daily cron stores
 * on `sleeve_state.signal_snapshot`.
 */
export const SleeveSignalCard = ({
  state,
}: {
  state: SleeveStateRow;
}): React.ReactNode => {
  const snap = state.signal_snapshot;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between text-base">
          <span>{state.asset} signals</span>
          {snap ? (
            <span className="text-xs font-normal text-muted-foreground">
              as of {formatDate(snap.time_ms)}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        {!snap ? (
          <p className="text-muted-foreground">
            Signal data arrives with the next daily run.
          </p>
        ) : (
          <>
            <Row label="EMA trend">
              <SignalPill on={snap.ema_signal === 1} />
            </Row>
            <Row label="EMA 20 / 50">
              {money(snap.ema_fast)} / {money(snap.ema_slow)}
            </Row>
            <Row label="EMA 200 filter">
              {money(snap.ema_filter)} vs close {money(snap.close)}
            </Row>
            <Row label="Donchian">
              <SignalPill on={snap.donchian_signal === 1} />
            </Row>
            <Row label="Entry 20d high / exit 10d low">
              {money(snap.donchian_upper)} / {money(snap.donchian_lower)}
            </Row>
            <Row label="Realized vol (30d, ann.)">
              {snap.realized_vol === null
                ? "—"
                : `${(snap.realized_vol * 100).toFixed(0)}%`}
            </Row>
            <Row label="Vol sizing">
              {snap.sizing_frac === null
                ? "—"
                : `${snap.sizing_frac.toFixed(2)}x`}
            </Row>
            <Row label="Ensemble target">
              {snap.ensemble_target.toFixed(2)}x
            </Row>
          </>
        )}
      </CardContent>
    </Card>
  );
};
