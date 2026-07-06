import { fireEvent, render, screen } from "@testing-library/react";

import { BacktestView } from "@/components/backtest/backtest-view";
import { downsample } from "@/components/backtest/backtest-equity-chart";
import { useBacktest } from "@/hooks/use-backtest";
import type {
  BacktestEquityPoint,
  BacktestReport,
} from "@/lib/backtest";

jest.mock("@/hooks/use-backtest");
// The lazy chart pulls in recharts (ESM/canvas); stub it for the view tests.
jest.mock("@/components/backtest/backtest-equity-chart.lazy", () => ({
  BacktestEquityChart: () => <div data-testid="equity-chart" />,
}));

const mockUseBacktest = useBacktest as jest.Mock;

const DAY = 86_400_000;
const T0 = 1_600_000_000_000;

const report = (over: Partial<BacktestReport> = {}): BacktestReport => ({
  asset: "BTC",
  period: "3y",
  startTimeMs: T0,
  endTimeMs: T0 + 10 * DAY,
  startCash: 1000,
  bars: 11,
  equity: [{ timeMs: T0, strategy: 1000, buyHold: 1000, dca: 1000 }],
  metrics: {
    equity: [1000, 2500],
    trades: [800, -120, 640],
    nTrades: 3,
    finalEquity: 2500,
    totalReturn: 1.5,
    maxDrawdown: -0.34,
    sharpe: 1.12,
  },
  benchmarks: {
    buyHold: { equity: [], finalEquity: 2000, totalReturn: 1.0, maxDrawdown: -0.6 },
    dca: { equity: [], finalEquity: 1600, totalReturn: 0.6, maxDrawdown: -0.4 },
  },
  roundTrips: [
    {
      entryTimeMs: T0,
      exitTimeMs: T0 + 5 * DAY,
      holdingDays: 5,
      entryPrice: 30_000,
      exitPrice: 34_000,
      pnl: 800,
    },
  ],
  roundTripStats: { count: 3, winRate: 2 / 3, avgPnl: 440, bestPnl: 800, worstPnl: -120 },
  events: [
    {
      asset: "BTC",
      timeMs: T0 + 2 * DAY,
      strategy: "donchian",
      signalBefore: 0,
      signalAfter: 1,
      reason: "Donchian breakout — close 32,000 above the 20-day high 31,500",
      context: {},
    },
  ],
  ...over,
});

const withState = (state: {
  data?: BacktestReport;
  isLoading?: boolean;
  error?: Error | null;
}): void => {
  mockUseBacktest.mockReturnValue({
    data: state.data,
    isLoading: state.isLoading ?? false,
    error: state.error ?? null,
  });
};

describe("BacktestView", () => {
  it("always shows the in-sample badge and disclaimer", () => {
    withState({ isLoading: true });
    render(<BacktestView />);
    expect(screen.getByText("historical · in-sample")).toBeInTheDocument();
    expect(screen.getByText(/Past results don't guarantee/)).toBeInTheDocument();
  });

  it("renders metrics, benchmark comparison and the round-trips", () => {
    withState({ data: report() });
    render(<BacktestView />);
    expect(screen.getByText("Total return")).toBeInTheDocument();
    expect(screen.getByText("+150.00%")).toBeInTheDocument(); // totalReturn 1.5
    expect(screen.getByText("-34.00%")).toBeInTheDocument(); // maxDrawdown
    expect(screen.getByText("Buy & hold return")).toBeInTheDocument();
    expect(screen.getByText("vs buy & hold")).toBeInTheDocument();
    expect(screen.getByText("+50.00%")).toBeInTheDocument(); // 1.5 - 1.0
    expect(screen.getByTestId("equity-chart")).toBeInTheDocument();
    expect(screen.getByText(/Closed round-trips \(3\)/)).toBeInTheDocument();
    expect(screen.getByText(/win rate 67%/)).toBeInTheDocument();
  });

  it("renders the historical signal feed", () => {
    withState({ data: report() });
    render(<BacktestView />);
    expect(screen.getByText("Donchian")).toBeInTheDocument();
    expect(screen.getByText("▲ entry")).toBeInTheDocument();
    expect(
      screen.getByText(/Donchian breakout — close 32,000/),
    ).toBeInTheDocument();
  });

  it("switching asset/period re-queries via the hook", () => {
    withState({ data: report() });
    render(<BacktestView />);
    // Initial render uses BTC + 3y.
    expect(mockUseBacktest).toHaveBeenCalledWith("BTC", "3y");
    fireEvent.click(screen.getByRole("button", { name: "ETH" }));
    fireEvent.click(screen.getByRole("button", { name: "1Y" }));
    expect(mockUseBacktest).toHaveBeenLastCalledWith("ETH", "1y");
  });

  it("shows an error state", () => {
    withState({ error: new Error("Binance unavailable") });
    render(<BacktestView />);
    expect(
      screen.getByText(/Couldn't run the backtest: Binance unavailable/),
    ).toBeInTheDocument();
  });

  it("shows an empty round-trips message", () => {
    withState({
      data: report({
        roundTrips: [],
        roundTripStats: { count: 0, winRate: 0, avgPnl: 0, bestPnl: 0, worstPnl: 0 },
      }),
    });
    render(<BacktestView />);
    expect(
      screen.getByText("No closed round-trips in this window."),
    ).toBeInTheDocument();
  });
});

describe("downsample", () => {
  const point = (i: number): BacktestEquityPoint => ({
    timeMs: i,
    strategy: i,
    buyHold: i,
    dca: i,
  });

  it("returns the series untouched when under the cap", () => {
    const pts = Array.from({ length: 10 }, (_, i) => point(i));
    expect(downsample(pts, 500)).toBe(pts);
  });

  it("thins to the cap and always keeps the last point", () => {
    const pts = Array.from({ length: 3000 }, (_, i) => point(i));
    const out = downsample(pts, 500);
    expect(out).toHaveLength(500);
    expect(out[0]).toEqual(point(0));
    expect(out[out.length - 1]).toEqual(point(2999));
  });
});
