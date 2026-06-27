import type { Transaction, TxType } from "@/lib/types";

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
};

/** Minimal generated-style schema for the typed Supabase client. */
export type Database = {
  public: {
    Tables: {
      transactions: {
        Row: TransactionRow;
        Insert: Omit<TransactionRow, "created_at"> & { created_at?: string };
        Update: Partial<TransactionRow>;
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
});
