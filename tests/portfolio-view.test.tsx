import { render, screen } from "@testing-library/react";
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
