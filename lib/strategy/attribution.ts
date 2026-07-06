/**
 * Signal attribution for the sleeve: derives per-strategy flip events and a
 * latest-bar indicator snapshot from the SAME parity-locked functions the
 * ensemble runs on (`emaTrendPositions`, `donchianPositions`, `ema`,
 * `realizedVol`, `ensembleTarget`) — flips are diffs of those outputs, never a
 * reimplementation. Donchian channel bounds are re-derived here for DISPLAY
 * only, with the exact max-high/min-low definition of `donchianPositions`.
 *
 * Timestamps follow the sleeve convention: a flip at index `i` is decided at
 * that bar's CLOSE and executes at bar `i+1`'s open, so an event's `timeMs`
 * (bar `i` open time) correlates with a trade at `timeMs + 1 day`.
 */

import { donchianPositions } from "@/lib/strategy/donchian";
import { emaTrendPositions } from "@/lib/strategy/emaTrend";
import { ensembleTarget } from "@/lib/strategy/ensemble";
import { ema, realizedVol } from "@/lib/strategy/indicators";
import type { Candle } from "@/lib/strategy/types";
import type { SleeveSignalSnapshot } from "@/lib/supabase/types";

export interface AttributionParams {
  fast?: number;
  slow?: number;
  trendFilter?: number;
  entry?: number;
  exit?: number;
  targetVol?: number;
  volWindow?: number;
}

/** One sub-strategy signal flip plus the indicator values that explain it. */
export interface SignalFlipEvent {
  asset: string;
  /** Open time (epoch ms) of the decision bar the flip was decided at. */
  timeMs: number;
  strategy: "ema_trend" | "donchian";
  signalBefore: number;
  signalAfter: number;
  /** Human-readable explanation naming the sub-condition that changed. */
  reason: string;
  /** Indicator values at the flip bar (display-only). */
  context: Record<string, number | null>;
}

/** Compact en-US number for reason strings (e.g. 68,412.34). */
const fmt = (value: number): string =>
  value.toLocaleString("en-US", { maximumFractionDigits: 2 });

/**
 * Display-only re-derivation of the Donchian channels used by
 * `donchianPositions`: `upper[i]` = max high of the previous `entry` bars,
 * `lower[i]` = min low of the previous `exit` bars; `null` during warm-up.
 */
export const donchianChannels = (
  candles: Candle[],
  { entry = 20, exit = 10 }: AttributionParams = {},
): { upper: (number | null)[]; lower: (number | null)[] } => {
  const n = candles.length;
  const upper: (number | null)[] = new Array<number | null>(n).fill(null);
  const lower: (number | null)[] = new Array<number | null>(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (i >= entry) {
      let hi = -Infinity;
      for (let j = i - entry; j < i; j++) hi = Math.max(hi, candles[j].high);
      upper[i] = hi;
    }
    if (i >= exit) {
      let lo = Infinity;
      for (let j = i - exit; j < i; j++) lo = Math.min(lo, candles[j].low);
      lower[i] = lo;
    }
  }
  return { upper, lower };
};

/** All per-bar series the snapshot and flip detection read from. */
const computeSeries = (
  candles: Candle[],
  {
    fast = 20,
    slow = 50,
    trendFilter = 200,
    entry = 20,
    exit = 10,
    targetVol = 0.6,
    volWindow = 30,
  }: AttributionParams = {},
) => {
  const closes = candles.map((c) => c.close);
  return {
    closes,
    emaFast: ema(closes, fast),
    emaSlow: ema(closes, slow),
    emaFilter: ema(closes, trendFilter),
    emaRaw: emaTrendPositions(candles, { fast, slow, trendFilter }),
    donRaw: donchianPositions(candles, { entry, exit }),
    channels: donchianChannels(candles, { entry, exit }),
    vol: realizedVol(closes, volWindow),
    // NOTE: ensembleTarget only takes targetVol — the strategy windows are
    // fixed at the validated 20/50/200 + 20/10 (HODL-HANDOVER.md §4.4), so
    // custom windows here (tests only) do not propagate into the ensemble.
    ensemble: ensembleTarget(candles, { targetVol }),
    params: { fast, slow, trendFilter, entry, exit, targetVol, volWindow },
  };
};

/** Vol-targeting fraction `min(1, targetVol / vol)`, or null during warm-up. */
const sizingFrac = (vol: number | null, targetVol: number): number | null =>
  vol !== null && vol > 0 ? Math.min(1, targetVol / vol) : null;

/**
 * Full indicator snapshot at bar `i` (the caller passes the latest closed
 * bar's index, e.g. from `latestClosedBarIndex`).
 */
export const signalSnapshotAt = (
  candles: Candle[],
  i: number,
  params: AttributionParams = {},
): SleeveSignalSnapshot => {
  if (i < 0 || i >= candles.length) {
    throw new Error(`signalSnapshotAt: index ${i} out of range`);
  }
  const s = computeSeries(candles, params);
  return {
    time_ms: candles[i].timeMs,
    close: candles[i].close,
    ema_fast: s.emaFast[i],
    ema_slow: s.emaSlow[i],
    ema_filter: s.emaFilter[i],
    ema_signal: s.emaRaw[i],
    donchian_upper: s.channels.upper[i],
    donchian_lower: s.channels.lower[i],
    donchian_signal: s.donRaw[i],
    realized_vol: s.vol[i],
    sizing_frac: sizingFrac(s.vol[i], s.params.targetVol),
    ensemble_target: s.ensemble[i],
  };
};

/** Reason for an EMA-trend flip at bar `i`, naming what changed since i−1. */
const emaTrendReason = (
  s: ReturnType<typeof computeSeries>,
  i: number,
  on: boolean,
): string => {
  const { fast, slow, trendFilter } = s.params;
  const f = s.emaFast[i] as number;
  const sl = s.emaSlow[i] as number;
  const t = s.emaFilter[i] as number;
  const close = s.closes[i];
  const prevCross =
    (s.emaFast[i - 1] as number) > (s.emaSlow[i - 1] as number);
  const prevAboveFilter = s.closes[i - 1] > (s.emaFilter[i - 1] as number);

  if (on) {
    const parts: string[] = [];
    parts.push(
      prevCross
        ? `EMA${fast} ${fmt(f)} above EMA${slow} ${fmt(sl)}`
        : `EMA${fast} ${fmt(f)} crossed above EMA${slow} ${fmt(sl)}`,
    );
    parts.push(
      prevAboveFilter
        ? `close ${fmt(close)} above EMA${trendFilter} ${fmt(t)}`
        : `close ${fmt(close)} crossed above EMA${trendFilter} ${fmt(t)}`,
    );
    return `EMA trend on — ${parts.join("; ")}`;
  }

  const parts: string[] = [];
  if (!(f > sl) && prevCross)
    parts.push(`EMA${fast} ${fmt(f)} fell below EMA${slow} ${fmt(sl)}`);
  if (!(close > t) && prevAboveFilter)
    parts.push(`close ${fmt(close)} fell below EMA${trendFilter} filter ${fmt(t)}`);
  // Both conditions can fail on the same bar; if neither newly failed we
  // still report the current state truthfully.
  if (parts.length === 0) {
    if (!(f > sl)) parts.push(`EMA${fast} ${fmt(f)} below EMA${slow} ${fmt(sl)}`);
    if (!(close > t))
      parts.push(`close ${fmt(close)} below EMA${trendFilter} filter ${fmt(t)}`);
  }
  return `EMA trend off — ${parts.join("; ")}`;
};

/**
 * Flip events for decision bars with `timeMs > afterTimeMs` and index
 * `≤ upToIndex`. Deterministic and window-idempotent: overlapping windows
 * emit identical events for shared bars. No events during indicator warm-up.
 */
export const computeSignalFlips = (
  asset: string,
  candles: Candle[],
  { afterTimeMs, upToIndex }: { afterTimeMs: number; upToIndex: number },
  params: AttributionParams = {},
): SignalFlipEvent[] => {
  const s = computeSeries(candles, params);
  const { entry, exit, targetVol } = s.params;
  const events: SignalFlipEvent[] = [];
  const last = Math.min(upToIndex, candles.length - 1);

  for (let i = 1; i <= last; i++) {
    if (candles[i].timeMs <= afterTimeMs) continue;

    const context: Record<string, number | null> = {
      close: s.closes[i],
      ema_fast: s.emaFast[i],
      ema_slow: s.emaSlow[i],
      ema_filter: s.emaFilter[i],
      donchian_upper: s.channels.upper[i],
      donchian_lower: s.channels.lower[i],
      realized_vol: s.vol[i],
      sizing_frac: sizingFrac(s.vol[i], targetVol),
      ensemble_before: s.ensemble[i - 1],
      ensemble_after: s.ensemble[i],
    };

    // EMA trend: only once every EMA is warm at BOTH bars of the diff.
    if (
      s.emaFilter[i - 1] !== null &&
      s.emaFast[i - 1] !== null &&
      s.emaSlow[i - 1] !== null &&
      s.emaRaw[i] !== s.emaRaw[i - 1]
    ) {
      events.push({
        asset,
        timeMs: candles[i].timeMs,
        strategy: "ema_trend",
        signalBefore: s.emaRaw[i - 1],
        signalAfter: s.emaRaw[i],
        reason: emaTrendReason(s, i, s.emaRaw[i] === 1),
        context,
      });
    }

    // Donchian: entry channel must exist at the previous bar too.
    if (i - 1 >= entry && s.donRaw[i] !== s.donRaw[i - 1]) {
      const on = s.donRaw[i] === 1;
      const level = on ? s.channels.upper[i] : s.channels.lower[i];
      events.push({
        asset,
        timeMs: candles[i].timeMs,
        strategy: "donchian",
        signalBefore: s.donRaw[i - 1],
        signalAfter: s.donRaw[i],
        reason: on
          ? `Donchian breakout — close ${fmt(s.closes[i])} above the ${entry}-day high ${fmt(level as number)}`
          : `Donchian exit — close ${fmt(s.closes[i])} below the ${exit}-day low ${fmt(level as number)}`,
        context,
      });
    }
  }
  return events;
};
