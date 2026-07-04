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
