import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { PortfolioView } from "@/components/portfolio/portfolio-view";
import { useMarkets } from "@/hooks/use-markets";
import { useMoney } from "@/hooks/use-money";
import { usePortfolioPrices } from "@/hooks/use-portfolio-prices";
import { useSearch } from "@/hooks/use-search";
import { usePortfolio } from "@/lib/portfolio";
import { derivePositions } from "@/lib/portfolio-core";
import type { Transaction } from "@/lib/types";

jest.mock("@/lib/portfolio");
jest.mock("@/hooks/use-portfolio-prices");
jest.mock("@/hooks/use-markets");
jest.mock("@/hooks/use-money");
jest.mock("@/hooks/use-search");

const mockUsePortfolio = usePortfolio as jest.Mock;
const mockUsePortfolioPrices = usePortfolioPrices as jest.Mock;
const mockUseMarkets = useMarkets as jest.Mock;
const mockUseMoney = useMoney as jest.Mock;
const mockUseSearch = useSearch as jest.Mock;

let seq = 0;
const tx = (over: Partial<Transaction>): Transaction => ({
  id: String(++seq),
  coinId: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  image: "",
  type: "buy",
  quantity: 1,
  amount: 100,
  date: seq,
  createdAt: seq,
  ...over,
});

/** Mount PortfolioView with a ledger; prices are only served for open coins. */
const setup = (
  transactions: Transaction[],
  prices: Record<string, { usd: number }> = {},
  priceState: { isLoading: boolean; data: unknown } = {
    isLoading: false,
    data: prices,
  },
): void => {
  mockUsePortfolio.mockReturnValue({
    transactions,
    positions: derivePositions(transactions),
    addTransactions: jest.fn(),
    exportJson: () => "[]",
    importJson: () => true,
    reload: jest.fn(),
  });
  mockUsePortfolioPrices.mockReturnValue(priceState);
  // The lazily-loaded DCA dialog runs its own query, so the subtree needs a
  // client even though every hook under test is mocked.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <PortfolioView />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  seq = 0;
  mockUseMarkets.mockReturnValue({ data: [] });
  mockUseSearch.mockReturnValue({ data: [], isLoading: false });
  mockUseMoney.mockReturnValue({
    currency: "usd",
    rate: 1,
    ready: true,
    format: (v: number | null | undefined) =>
      v == null ? "—" : `$${v.toFixed(2)}`,
    formatCompact: (v: number | null | undefined) =>
      v == null ? "—" : `$${v.toFixed(2)}`,
    toUsd: (v: number) => v,
  });
});

describe("PortfolioView with a fully closed-out ledger", () => {
  const soldOut = [
    tx({ type: "buy", quantity: 1, amount: 100, date: 1 }),
    tx({ type: "sell", quantity: 1, amount: 180, date: 2 }),
  ];

  it("renders the ledger instead of hanging on the loading skeleton", () => {
    // No open positions → usePortfolioPrices is disabled, so it never resolves:
    // pending data with isLoading false is exactly what React Query reports.
    setup(soldOut, {}, { isLoading: false, data: undefined });

    expect(screen.getByText("Total Value")).toBeInTheDocument();
    expect(screen.queryByText(/No transactions yet/)).not.toBeInTheDocument();
  });

  it("keeps the realized P&L of the closed position in the summary", () => {
    setup(soldOut, {}, { isLoading: false, data: undefined });

    // Bought for $100, sold for $180 → +$80 booked, and it must survive the
    // position having no remaining quantity.
    expect(screen.getByText("Realized P&L")).toBeInTheDocument();
    expect(screen.getByText("+$80.00")).toBeInTheDocument();
  });
});

describe("PortfolioView with open positions", () => {
  it("still waits for prices before rendering the summary", () => {
    setup([tx({ quantity: 2, amount: 100 })], {}, {
      isLoading: true,
      data: undefined,
    });

    expect(screen.queryByText("Total Value")).not.toBeInTheDocument();
  });

  it("sums realized P&L from closed positions alongside open ones", () => {
    setup(
      [
        tx({ coinId: "bitcoin", type: "buy", quantity: 1, amount: 100, date: 1 }),
        tx({ coinId: "bitcoin", type: "sell", quantity: 1, amount: 180, date: 2 }),
        tx({
          coinId: "ethereum",
          symbol: "eth",
          name: "Ethereum",
          type: "buy",
          quantity: 2,
          amount: 200,
          date: 3,
        }),
      ],
      { ethereum: { usd: 150 } },
    );

    // ETH is the only open position: 2 × $150 = $300 (hero + positions table).
    expect(screen.getAllByText("$300.00").length).toBeGreaterThan(0);
    // BTC's booked +$80 is not silently dropped.
    expect(screen.getByText("+$80.00")).toBeInTheDocument();
  });
});

describe("invested vs current value", () => {
  it("shows the total invested in the summary alongside the current value", () => {
    setup([tx({ quantity: 2, amount: 100 })], { bitcoin: { usd: 75 } });

    // $100 in, 2 units now worth $75 each = $150. Both layouts render under
    // jsdom (md:hidden is CSS only), so the figures appear more than once.
    expect(screen.getAllByText("$150.00").length).toBeGreaterThan(0);
    // Same wording in the hero and in the mobile position card.
    expect(screen.getAllByText("$100.00 invested").length).toBeGreaterThan(0);
  });

  it("values each buy at today's price in the ledger", () => {
    setup([tx({ quantity: 2, amount: 100 })], { bitcoin: { usd: 75 } });

    // The buy's own units: $100 spent, worth $150 today → +50%.
    expect(screen.getAllByText("+50.00%").length).toBeGreaterThan(0);
  });

  it("dashes a sell rather than pricing proceeds as a holding", () => {
    setup(
      [
        tx({ type: "buy", quantity: 2, amount: 100, date: 1 }),
        tx({ type: "sell", quantity: 1, amount: 90, date: 2 }),
      ],
      { bitcoin: { usd: 75 } },
    );

    // Scoped to the sell's own ledger row: other columns (Realized, 24h) also
    // render a dash, so a bare document-wide query would pass either way.
    // Both layouts render under jsdom, so reach for the table's badge.
    const rowFor = (type: string): HTMLElement => {
      const row = screen
        .getAllByText(type)
        .map((el) => el.closest("tr"))
        .find((el): el is HTMLTableRowElement => el !== null);
      if (!row) throw new Error(`no ledger row for a ${type}`);
      return row;
    };

    expect(within(rowFor("sell")).getByText("—")).toBeInTheDocument();
    // The buy in the same ledger still gets priced: 2 units at $75 = $150.
    expect(within(rowFor("buy")).getByText("$150.00")).toBeInTheDocument();
  });
});
