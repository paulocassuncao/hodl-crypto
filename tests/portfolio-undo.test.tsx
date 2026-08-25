import { act, render, waitFor } from "@testing-library/react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { PortfolioProvider, usePortfolio } from "@/lib/portfolio";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { TransactionRow } from "@/lib/supabase/types";

jest.mock("@/lib/supabase/client");
jest.mock("@/lib/auth");
jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }),
}));

const USER_ID = "user-a";

const row = (over: Partial<TransactionRow> = {}): TransactionRow => ({
  id: "tx-1",
  user_id: USER_ID,
  coin_id: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  image: "",
  type: "buy",
  quantity: 0.5,
  amount: 20_000,
  date: "2026-03-01T00:00:00.000Z",
  created_at: "2026-03-01T12:34:56.000Z",
  source: "manual",
  ...over,
});

/** Writes the fake Supabase client recorded for the current test. */
type Writes = {
  deleted: string[];
  inserted: Record<string, unknown>[];
};

/**
 * Mount the real PortfolioProvider over a fake Supabase client seeded with
 * `rows`, and hand back its context plus the writes the provider issued.
 */
const mountPortfolio = async (
  rows: TransactionRow[],
): Promise<{
  portfolio: { current: ReturnType<typeof usePortfolio> };
  writes: Writes;
}> => {
  const writes: Writes = { deleted: [], inserted: [] };

  (useAuth as jest.Mock).mockReturnValue({ user: { id: USER_ID } });
  (getSupabaseBrowserClient as jest.Mock).mockReturnValue({
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: rows, error: null }),
      }),
      delete: () => ({
        eq: (_column: string, value: string) => {
          writes.deleted.push(value);
          return Promise.resolve({ error: null });
        },
      }),
      insert: (payload: Record<string, unknown>) => {
        writes.inserted.push(payload);
        return Promise.resolve({ error: null });
      },
    }),
  });

  const portfolio = {} as { current: ReturnType<typeof usePortfolio> };
  const Probe = (): null => {
    portfolio.current = usePortfolio();
    return null;
  };
  render(
    <PortfolioProvider>
      <Probe />
    </PortfolioProvider>,
  );
  // Let the mount-time reload() land before the test drives the context.
  await waitFor(() =>
    expect(portfolio.current.transactions).toHaveLength(rows.length),
  );
  return { portfolio, writes };
};

/** The Undo handler off the last `toast(...)` call the provider made. */
const undoFromToast = (): (() => void) => {
  const calls = (toast as unknown as jest.Mock).mock.calls;
  const [, options] = calls[calls.length - 1] as [
    string,
    { action: { label: string; onClick: () => void } },
  ];
  expect(options.action.label).toBe("Undo");
  return options.action.onClick;
};

beforeEach(() => {
  jest.clearAllMocks();
});

/**
 * The Undo on a deleted transaction is the only safety net on a destructive
 * write to the ledger — a bare trash icon commits the delete on one click.
 * These cover the reversal itself, not the delete.
 */
describe("PortfolioProvider delete undo", () => {
  it("re-inserts the exact row, preserving id and createdAt", async () => {
    const { portfolio, writes } = await mountPortfolio([row()]);

    act(() => portfolio.current.removeTransaction("tx-1"));
    expect(portfolio.current.transactions).toHaveLength(0);
    expect(writes.deleted).toEqual(["tx-1"]);

    await act(async () => undoFromToast()());

    // Identity has to survive the round trip: a regenerated id or createdAt
    // would restore a *different* transaction and reorder the ledger.
    expect(writes.inserted).toHaveLength(1);
    expect(writes.inserted[0]).toMatchObject({
      id: "tx-1",
      created_at: "2026-03-01T12:34:56.000Z",
      date: "2026-03-01T00:00:00.000Z",
      quantity: 0.5,
      amount: 20_000,
    });
    expect(portfolio.current.transactions.map((t) => t.id)).toEqual(["tx-1"]);
  });

  it("re-inserts under the signed-in user, not a null owner", async () => {
    const { portfolio, writes } = await mountPortfolio([row()]);

    act(() => portfolio.current.removeTransaction("tx-1"));
    await act(async () => undoFromToast()());

    // toRow(removed, userId!) — a null userId here writes an unowned row that
    // RLS rejects, losing the transaction the user just asked to keep.
    expect(writes.inserted[0]).toMatchObject({ user_id: USER_ID });
  });

  it("does not duplicate the row when Undo is clicked twice", async () => {
    const { portfolio } = await mountPortfolio([row()]);

    act(() => portfolio.current.removeTransaction("tx-1"));
    const undo = undoFromToast();
    await act(async () => undo());
    await act(async () => undo());

    expect(portfolio.current.transactions.map((t) => t.id)).toEqual(["tx-1"]);
  });

  it("leaves the ledger and the toast alone for an unknown id", async () => {
    const { portfolio, writes } = await mountPortfolio([row()]);

    act(() => portfolio.current.removeTransaction("tx-missing"));

    expect(portfolio.current.transactions).toHaveLength(1);
    expect(writes.deleted).toEqual([]);
    expect(toast as unknown as jest.Mock).not.toHaveBeenCalled();
  });
});
