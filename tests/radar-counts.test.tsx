import { render, screen, waitFor } from "@testing-library/react";

import { Providers } from "@/components/providers";
import { RadarView } from "@/components/radar/radar-view";
import { useMarkets } from "@/hooks/use-markets";
import type { Coin } from "@/lib/types";

// The sparkline renders an inline SVG per row; skip it in tests.
jest.mock("@/components/market-table/sparkline", () => ({
  Sparkline: (): null => null,
}));
jest.mock("@/hooks/use-markets");

let search = "";
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(search),
}));

const mockUseMarkets = useMarkets as jest.Mock;

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

const MARKETS: Coin[] = [
  coin({ id: "bitcoin", symbol: "btc", market_cap_rank: 1 }),
  coin({ id: "ethereum", symbol: "eth", market_cap_rank: 2 }),
  coin({ id: "solana", symbol: "sol", market_cap_rank: 3 }),
  coin({ id: "cardano", symbol: "ada", market_cap_rank: 4 }),
];

/** Mount the screener with `query` as the URL and `starred` in the watchlist. */
const setup = (query: string, starred: string[] = []): void => {
  search = query;
  window.localStorage.setItem("hodl:watchlist", JSON.stringify(starred));
  mockUseMarkets.mockReturnValue({
    data: MARKETS,
    isLoading: false,
    isError: false,
    error: null,
  });
  render(
    <Providers>
      <RadarView embedded />
    </Providers>,
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
});

/**
 * The pure branches are covered in radar.test.ts; what is untested there is the
 * *wiring* — which of `data` / `starred` / `searched` / `rows` reaches which
 * prop. Getting that mapping wrong is exactly the bug this screen already had
 * ("Showing 2 of 100" while the user looked at 4 starred coins), and it lives
 * in the view, so only a render test can catch it coming back.
 */
describe("RadarView counts", () => {
  it("counts against the whole market when nothing narrows it", async () => {
    // A condition every coin passes: the denominator is the market, not zero.
    setup("f=24h:gte:-100");
    await waitFor(() =>
      expect(screen.getByText(/Showing 4 of 4/)).toBeInTheDocument(),
    );
  });

  it("counts against the watchlist, not the market, when it is on", async () => {
    setup("w=1&f=24h:gte:-100", ["bitcoin", "ethereum"]);
    // The regression guard: `data.length` here would read "Showing 2 of 4".
    await waitFor(() =>
      expect(screen.getByText(/Showing 2 of 2/)).toBeInTheDocument(),
    );
  });

  it("counts against the search results, not the market", async () => {
    setup("q=bitcoin&f=24h:gte:-100");
    await waitFor(() =>
      expect(screen.getByText(/Showing 1 of 1/)).toBeInTheDocument(),
    );
  });

  it("blames the conditions, agreeing with its own count, when they empty it", async () => {
    // Search finds one coin, the condition removes it. The count and the empty
    // message are two readings of the same state and must not contradict.
    setup("q=bitcoin&f=24h:gte:50");
    await waitFor(() =>
      expect(screen.getByText(/Showing 0 of 1/)).toBeInTheDocument(),
    );
    expect(
      screen.getAllByText(/adjust a condition or clear them/i).length,
    ).toBeGreaterThan(0);
  });

  it("blames the search when the search is what emptied it", async () => {
    setup("q=zzz&f=24h:gte:-100");
    await waitFor(() =>
      expect(screen.getByText(/Showing 0 of 0/)).toBeInTheDocument(),
    );
    expect(screen.getAllByText("No coins match “zzz”.").length).toBeGreaterThan(
      0,
    );
  });

  it("blames the search, not the top 100, when a star is filtered out by it", async () => {
    // starred.length is 1 and searched.length is 0 — the only shape that tells
    // the two counts apart, and the exact swap that shipped a false message.
    setup("w=1&q=zzz", ["bitcoin"]);
    await waitFor(() =>
      expect(
        screen.getAllByText("No coins match “zzz”.").length,
      ).toBeGreaterThan(0),
    );
    expect(
      screen.queryByText(/None of your starred coins are in the top 100/i),
    ).toBeNull();
  });

  it("asks for a star when the watchlist is on and empty", async () => {
    setup("w=1&f=24h:gte:-100", []);
    await waitFor(() =>
      expect(
        screen.getAllByText(/No coins in your watchlist yet/i).length,
      ).toBeGreaterThan(0),
    );
  });

  it("names the top-100 boundary when a star is not in this dataset", async () => {
    setup("w=1&f=24h:gte:-100", ["some-obscure-microcap"]);
    await waitFor(() =>
      expect(
        screen.getAllByText(/None of your starred coins are in the top 100/i)
          .length,
      ).toBeGreaterThan(0),
    );
  });
});
