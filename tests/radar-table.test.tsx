import { fireEvent, render, screen, within } from "@testing-library/react";

import { RadarTable } from "@/components/radar/radar-table";
import { Providers } from "@/components/providers";
import type { Coin } from "@/lib/types";

// The sparkline renders an inline SVG ~100×; skip it in tests.
jest.mock("@/components/market-table/sparkline", () => ({
  Sparkline: (): null => null,
}));

const coin = (over: Partial<Coin> & Pick<Coin, "id" | "symbol">): Coin => ({
  name: over.id,
  image: "https://example.com/icon.png",
  current_price: 100,
  market_cap: 0,
  market_cap_rank: 1,
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
  price_change_percentage_30d_in_currency: 0,
  sparkline_in_7d: null,
  ...over,
});

const btc = coin({
  id: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  price_change_percentage_24h_in_currency: 2,
});

const eth = coin({
  id: "ethereum",
  symbol: "eth",
  name: "Ethereum",
  price_change_percentage_24h_in_currency: 8,
});

const renderTable = (
  props: Partial<React.ComponentProps<typeof RadarTable>> = {},
): void => {
  render(
    <Providers>
      <RadarTable
        rows={[btc, eth]}
        btc={btc}
        currency="usd"
        sortKey="24h"
        sortDir="desc"
        onSort={jest.fn()}
        onOpenChart={jest.fn()}
        isLoading={false}
        {...props}
      />
    </Providers>,
  );
};

// The md+ <table> is the single role="table"; mobile cards use a <ul>.
const table = (): HTMLElement => screen.getByRole("table");

describe("RadarTable", () => {
  it("renders each cell as performance relative to BTC", () => {
    renderTable();
    expect(within(table()).getByText("Ethereum")).toBeInTheDocument();
    // ETH 24h 8% − BTC 2% = +6% over BTC (never the raw +8.00%).
    expect(within(table()).getByText("+6.00%")).toBeInTheDocument();
    expect(within(table()).queryByText("+8.00%")).not.toBeInTheDocument();
    // BTC measured against itself collapses to zero across every window.
    expect(within(table()).getAllByText("0.00%").length).toBeGreaterThan(0);
  });

  it("calls onSort when a metric header is clicked", () => {
    const onSort = jest.fn();
    renderTable({ onSort });
    fireEvent.click(screen.getByRole("button", { name: /^7d$/i }));
    expect(onSort).toHaveBeenCalledWith("7d");
  });

  it("calls onOpenChart when a row's chart button is clicked", () => {
    const onOpenChart = jest.fn();
    renderTable({ onOpenChart });
    fireEvent.click(
      within(table()).getByRole("button", { name: /open ethereum chart/i }),
    );
    expect(onOpenChart).toHaveBeenCalledWith(eth);
  });

  it("shows a teaching empty state when no rows match", () => {
    renderTable({ rows: [] });
    expect(screen.getAllByText(/no coins match these filters/i).length).toBeGreaterThan(0);
  });
});
