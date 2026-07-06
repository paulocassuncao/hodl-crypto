import type { Transaction, TxSource, TxType } from "@/lib/types";

/**
 * A row of `public.transactions` as stored in Supabase (snake_case, ISO dates).
 * Declared as a `type` (not `interface`) so it satisfies supabase-js's
 * `Record<string, unknown>` schema constraint — interfaces lack the implicit
 * index signature and make the typed client collapse table types to `never`.
 */
export type TransactionRow = {
  id: string;
  user_id: string;
  coin_id: string;
  symbol: string;
  name: string;
  image: string;
  type: TxType;
  quantity: number;
  amount: number;
  /** ISO 8601 timestamptz. */
  date: string;
  /** ISO 8601 timestamptz. */
  created_at: string;
  /** Provenance of the row; the column defaults to 'manual'. */
  source: TxSource;
};

/**
 * Latest-bar indicator snapshot for one sleeve asset, stored as jsonb on
 * `sleeve_state.signal_snapshot` (snake_case keys, matching the column
 * convention). Numeric fields are null while the indicator is warming up.
 */
export type SleeveSignalSnapshot = {
  /** Open time (epoch ms) of the decision bar the snapshot describes. */
  time_ms: number;
  close: number;
  ema_fast: number | null;
  ema_slow: number | null;
  ema_filter: number | null;
  /** Raw EMA-trend signal at the bar (0 or 1). */
  ema_signal: number;
  /** Donchian entry level: max high of the previous `entry` bars. */
  donchian_upper: number | null;
  /** Donchian exit level: min low of the previous `exit` bars. */
  donchian_lower: number | null;
  /** Raw Donchian signal at the bar (0 or 1). */
  donchian_signal: number;
  realized_vol: number | null;
  /** Vol-targeting fraction min(1, targetVol / realizedVol). */
  sizing_frac: number | null;
  /** Blended ensemble target exposure in [0, 1]. */
  ensemble_target: number;
};

/**
 * A row of `public.sleeve_state` — per-asset paper-trading account state for
 * the trading sleeve (PK: user_id + asset).
 */
export type SleeveStateRow = {
  user_id: string;
  /** "BTC" | "ETH". */
  asset: string;
  cash: number;
  units: number;
  /** Current target exposure in [0, 1]. */
  position: number;
  /** Open time (epoch ms) of the last processed daily bar. */
  last_time_ms: number;
  /** Fictitious starting capital for this asset (e.g. 500). */
  allocation: number;
  target_vol: number;
  /** Indicator snapshot at the latest closed bar; null before the first run. */
  signal_snapshot: SleeveSignalSnapshot | null;
};

/** A row of `public.sleeve_trades` — one simulated fill. */
export type SleeveTradeRow = {
  id: string;
  user_id: string;
  asset: string;
  time_ms: number;
  side: "buy" | "sell";
  price: number;
  units: number;
  position_after: number;
  equity_after: number;
};

/** A row of `public.sleeve_equity` — the forward mark-to-market curve. */
export type SleeveEquityRow = {
  user_id: string;
  asset: string;
  time_ms: number;
  equity: number;
};

/**
 * A row of `public.sleeve_signal_events` — one sub-strategy signal flip with
 * its attribution. `time_ms` is the DECISION bar's open time: the flip is
 * decided at that bar's close and executes at the next bar's open, so a trade
 * at `t` correlates with events at `t − 1 day`.
 */
export type SleeveSignalEventRow = {
  id: string;
  user_id: string;
  asset: string;
  time_ms: number;
  strategy: "ema_trend" | "donchian";
  /** Raw signal (0 or 1) at the previous decision bar. */
  signal_before: number;
  /** Raw signal (0 or 1) at this decision bar. */
  signal_after: number;
  /** Human-readable explanation, e.g. "Donchian breakout — close …". */
  reason: string;
  /** Indicator values at the flip bar (display-only). */
  context: Record<string, number | null>;
  /** ISO 8601 timestamptz. */
  created_at: string;
};

/**
 * A row of `public.bybit_sync_state` — the append-only Bybit sync watermark
 * (PK: user_id). {@link last_synced_ms} is the upper bound of the last scanned
 * Bybit range, so the next sync scans `[last_synced_ms, now)` regardless of
 * ledger contents.
 */
export type BybitSyncStateRow = {
  user_id: string;
  /** Upper bound (epoch ms) of the last scanned Bybit range. */
  last_synced_ms: number;
  /** ISO 8601 timestamptz. */
  updated_at: string;
};

/** Minimal generated-style schema for the typed Supabase client. */
export type Database = {
  public: {
    Tables: {
      transactions: {
        Row: TransactionRow;
        Insert: Omit<TransactionRow, "created_at" | "source"> & {
          created_at?: string;
          source?: TxSource;
        };
        Update: Partial<TransactionRow>;
        Relationships: [];
      };
      sleeve_state: {
        Row: SleeveStateRow;
        Insert: SleeveStateRow;
        Update: Partial<SleeveStateRow>;
        Relationships: [];
      };
      sleeve_trades: {
        Row: SleeveTradeRow;
        Insert: Omit<SleeveTradeRow, "id"> & { id?: string };
        Update: Partial<SleeveTradeRow>;
        Relationships: [];
      };
      sleeve_equity: {
        Row: SleeveEquityRow;
        Insert: SleeveEquityRow;
        Update: Partial<SleeveEquityRow>;
        Relationships: [];
      };
      sleeve_signal_events: {
        Row: SleeveSignalEventRow;
        Insert: Omit<SleeveSignalEventRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<SleeveSignalEventRow>;
        Relationships: [];
      };
      bybit_sync_state: {
        Row: BybitSyncStateRow;
        Insert: Omit<BybitSyncStateRow, "updated_at"> & { updated_at?: string };
        Update: Partial<BybitSyncStateRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

/** Map a Supabase row to the app's epoch-ms {@link Transaction} shape. */
export const toTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  coinId: row.coin_id,
  symbol: row.symbol,
  name: row.name,
  image: row.image,
  type: row.type,
  quantity: row.quantity,
  amount: row.amount,
  date: new Date(row.date).getTime(),
  createdAt: new Date(row.created_at).getTime(),
  source: row.source,
});

/** Map an app {@link Transaction} to an insertable row for the given user. */
export const toRow = (
  tx: Transaction,
  userId: string,
): Database["public"]["Tables"]["transactions"]["Insert"] => ({
  id: tx.id,
  user_id: userId,
  coin_id: tx.coinId,
  symbol: tx.symbol,
  name: tx.name,
  image: tx.image,
  type: tx.type,
  quantity: tx.quantity,
  amount: tx.amount,
  date: new Date(tx.date).toISOString(),
  created_at: new Date(tx.createdAt).toISOString(),
  source: tx.source ?? "manual",
});
