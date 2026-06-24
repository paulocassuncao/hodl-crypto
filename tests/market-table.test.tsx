import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import { MarketTable } from "@/components/market-table/market-table";
import { Providers } from "@/components/providers";
import { fetchMarkets } from "@/lib/api";
import type { Coin } from "@/lib/types";

// Avoid rendering recharts SVG inside the table during tests.
jest.mock("@/components/market-table/sparkline", () => ({
  Sparkline: (): null => null,
}));

jest.mock("@/lib/api", () => ({
  fetchMarkets: jest.fn(),
}));

const makeCoin = (
  over: Partial<Coin> & Pick<Coin, "id" | "name" | "symbol">,
): Coin => ({
  image: "https://example.com/icon.png",
  current_price: 0,
  market_cap: 0,
  market_cap_rank: 0,
  total_volume: 0,
  high_24h: null,
  low_24h: null,
  circulating_supply: null,
  total_supply: null,
  max_supply: null,
  ath: null,
  atl: null,
  price_change_percentage_1h_in_currency: 0,
  price_change_percentage_24h_in_currency: 0,
  price_change_percentage_7d_in_currency: 0,
  sparkline_in_7d: { price: [1, 2] },
  ...over,
});

const COINS: Coin[] = [
  makeCoin({
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "btc",
    market_cap_rank: 1,
    current_price: 60000,
  }),
  makeCoin({
    id: "ethereum",
    name: "Ethereum",
    symbol: "eth",
    market_cap_rank: 2,
    current_price: 3000,
  }),
  makeCoin({
    id: "solana",
    name: "Solana",
    symbol: "sol",
    market_cap_rank: 3,
    current_price: 150,
  }),
];

const renderTable = (): void => {
  (fetchMarkets as jest.Mock).mockResolvedValue(COINS);
  render(
    <Providers>
      <MarketTable />
    </Providers>,
  );
};

// The component renders both a mobile card list and the md+ table, so coin
// names appear twice in jsdom. Scope name lookups to the <table> for clarity.
const table = (): HTMLElement => screen.getByRole("table");

const bodyRowNames = (): string[] =>
  screen
    .getAllByRole("row")
    .slice(1) // drop the header row
    .map((row) => within(row).queryByRole("link")?.textContent ?? "");

describe("MarketTable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it("renders the top coins once data loads", async () => {
    renderTable();
    await waitFor(() =>
      expect(within(table()).getByText("Bitcoin")).toBeInTheDocument(),
    );
    expect(within(table()).getByText("Ethereum")).toBeInTheDocument();
    expect(within(table()).getByText("Solana")).toBeInTheDocument();
  });

  it("filters rows by the search query", async () => {
    renderTable();
    await waitFor(() =>
      expect(within(table()).getByText("Bitcoin")).toBeInTheDocument(),
    );

    fireEvent.change(
      screen.getByLabelText("Filter the top 100 coins by name or symbol"),
      {
        target: { value: "eth" },
      },
    );

    expect(within(table()).getByText("Ethereum")).toBeInTheDocument();
    expect(within(table()).queryByText("Bitcoin")).not.toBeInTheDocument();
    expect(within(table()).queryByText("Solana")).not.toBeInTheDocument();
  });

  it("sorts by price when the Price header is toggled", async () => {
    renderTable();
    await waitFor(() =>
      expect(within(table()).getByText("Bitcoin")).toBeInTheDocument(),
    );

    const priceHeader = screen.getByRole("button", { name: /^price$/i });

    // First click → descending (highest price first).
    fireEvent.click(priceHeader);
    await waitFor(() => expect(bodyRowNames()[0]).toContain("Bitcoin"));

    // Second click → ascending (lowest price first).
    fireEvent.click(priceHeader);
    await waitFor(() => expect(bodyRowNames()[0]).toContain("Solana"));
  });

  it("filters to starred coins when the Watchlist tab is selected", async () => {
    renderTable();
    await waitFor(() =>
      expect(within(table()).getByText("Bitcoin")).toBeInTheDocument(),
    );

    // Star Bitcoin via its table row's watchlist button.
    const bitcoinRow = within(table())
      .getByText("Bitcoin")
      .closest("tr") as HTMLElement;
    fireEvent.click(
      within(bitcoinRow).getByRole("button", { name: /add to watchlist/i }),
    );

    // Switch to the Watchlist filter.
    fireEvent.click(screen.getByRole("tab", { name: /watchlist/i }));

    await waitFor(() => {
      expect(within(table()).getByText("Bitcoin")).toBeInTheDocument();
      expect(within(table()).queryByText("Ethereum")).not.toBeInTheDocument();
      expect(within(table()).queryByText("Solana")).not.toBeInTheDocument();
    });
  });
});
