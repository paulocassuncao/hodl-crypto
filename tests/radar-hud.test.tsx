import { render, screen, waitFor } from "@testing-library/react";

import { RadarHud } from "@/components/radar/radar-hud";
import { Providers } from "@/components/providers";
import {
  fetchCoinChart,
  fetchFearGreed,
  fetchGlobal,
  fetchPortfolioPrices,
} from "@/lib/api";

jest.mock("@/components/market-table/sparkline", () => ({
  Sparkline: (): null => null,
}));

jest.mock("@/lib/api", () => ({
  fetchGlobal: jest.fn(),
  fetchFearGreed: jest.fn(),
  fetchPortfolioPrices: jest.fn(),
  fetchCoinChart: jest.fn(),
  fetchFxRates: jest.fn(),
}));

const GLOBAL = {
  total_market_cap: { usd: 2_500_000_000_000 },
  total_volume: { usd: 100_000_000_000 },
  market_cap_percentage: { btc: 58.4, eth: 9.1 },
  active_cryptocurrencies: 12000,
  markets: 900,
  market_cap_change_percentage_24h_usd: 1.8,
};

const seedHappyPath = (): void => {
  (fetchGlobal as jest.Mock).mockResolvedValue(GLOBAL);
  (fetchFearGreed as jest.Mock).mockResolvedValue({
    value: 28,
    classification: "Fear",
    timestamp: 0,
  });
  (fetchPortfolioPrices as jest.Mock).mockResolvedValue({
    "pax-gold": { usd: 4067.39, usd_24h_change: 0.9 },
  });
  (fetchCoinChart as jest.Mock).mockResolvedValue([
    { time: 1, price: 4000 },
    { time: 2, price: 4067 },
  ]);
};

const renderHud = (): void => {
  render(
    <Providers>
      <RadarHud />
    </Providers>,
  );
};

describe("RadarHud", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it("renders all four context cards from the data hooks", async () => {
    seedHappyPath();
    renderHud();

    // Card titles render immediately; values appear once the hooks resolve.
    expect(screen.getByText("Fear & Greed")).toBeInTheDocument();
    expect(screen.getByText("BTC Dominance")).toBeInTheDocument();
    expect(screen.getByText("Total Market Cap")).toBeInTheDocument();
    expect(screen.getByText("Gold · PAXG")).toBeInTheDocument();

    // BTC dominance value + ETH subline (wait for the global query to resolve).
    await waitFor(() =>
      expect(screen.getByText("58.4%")).toBeInTheDocument(),
    );
    expect(screen.getByText(/ETH 9\.1%/)).toBeInTheDocument();
  });

  it("shows the gold price, 24h change, and 7d trend", async () => {
    seedHappyPath();
    renderHud();

    await waitFor(() =>
      expect(screen.getByText("$4,067.39")).toBeInTheDocument(),
    );
    // 24h change + its label.
    expect(screen.getByText("+0.90%")).toBeInTheDocument();
    expect(screen.getByText("24h")).toBeInTheDocument();
    // 7d trend is derived from the chart series (4000 → 4067 ≈ +1.7%).
    expect(screen.getByText("7d")).toBeInTheDocument();
    expect(screen.getByText(/^\+1\.6[78]%$/)).toBeInTheDocument();
  });

  it("drops the gold card without breaking the strip when gold errors", async () => {
    seedHappyPath();
    (fetchPortfolioPrices as jest.Mock).mockRejectedValue(new Error("boom"));
    renderHud();

    // The rest of the HUD still renders.
    expect(screen.getByText("BTC Dominance")).toBeInTheDocument();
    // Gold drops out once the query exhausts its retry and errors.
    await waitFor(
      () => expect(screen.queryByText("Gold · PAXG")).not.toBeInTheDocument(),
      { timeout: 5000 },
    );
  });
});
