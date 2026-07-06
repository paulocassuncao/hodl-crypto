import { render, screen } from "@testing-library/react";

import { isStale, SleeveView } from "@/components/sleeve/sleeve-view";
import { toChartSeries } from "@/components/sleeve/sleeve-equity-chart";
import { useSleeve, useSleeveSignalEvents } from "@/hooks/use-sleeve";
import type {
  SleeveEquityRow,
  SleeveSignalEventRow,
  SleeveSignalSnapshot,
  SleeveStateRow,
  SleeveTradeRow,
} from "@/lib/supabase/types";

jest.mock("@/hooks/use-sleeve");
const mockUseSleeve = useSleeve as jest.Mock;
const mockUseSleeveSignalEvents = useSleeveSignalEvents as jest.Mock;

beforeEach(() => {
  mockUseSleeveSignalEvents.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
  });
});

const state = (over: Partial<SleeveStateRow>): SleeveStateRow => ({
  user_id: "u1",
  asset: "BTC",
  cash: 500,
  units: 0,
  position: 0,
  last_time_ms: 1_700_000_000_000,
  allocation: 500,
  target_vol: 0.6,
  signal_snapshot: null,
  ...over,
});

const snapshot = (
  over: Partial<SleeveSignalSnapshot> = {},
): SleeveSignalSnapshot => ({
  time_ms: 1_700_000_000_000,
  close: 69_120,
  ema_fast: 68_412,
  ema_slow: 67_988,
  ema_filter: 61_340,
  ema_signal: 1,
  donchian_upper: 68_900,
  donchian_lower: 61_450,
  donchian_signal: 0,
  realized_vol: 0.8,
  sizing_frac: 0.75,
  ensemble_target: 0.35,
  ...over,
});

const signalEvent = (
  over: Partial<SleeveSignalEventRow> = {},
): SleeveSignalEventRow => ({
  id: "e1",
  user_id: "u1",
  asset: "BTC",
  time_ms: 1_700_000_000_000,
  strategy: "donchian",
  signal_before: 0,
  signal_after: 1,
  reason: "Donchian breakout — close 69,120 above the 20-day high 68,900",
  context: {},
  created_at: "2026-07-01T00:00:00Z",
  ...over,
});

const withData = (data: {
  states?: SleeveStateRow[];
  trades?: SleeveTradeRow[];
  equity?: SleeveEquityRow[];
  events?: SleeveSignalEventRow[];
}): void => {
  mockUseSleeve.mockReturnValue({
    data: { states: [], trades: [], equity: [], ...data },
    isLoading: false,
    error: null,
  });
  mockUseSleeveSignalEvents.mockReturnValue({
    data: data.events ?? [],
    isLoading: false,
    error: null,
  });
};

describe("SleeveView", () => {
  it("always shows the paper badge, even before initialization", () => {
    mockUseSleeve.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<SleeveView />);
    expect(screen.getByText("paper · validating")).toBeInTheDocument();
  });

  it("shows the uninitialized empty state", () => {
    withData({});
    render(<SleeveView />);
    expect(screen.getByText("Sleeve not initialized yet")).toBeInTheDocument();
  });

  it("shows cash exposure and the waiting-for-trend empty trade log", () => {
    withData({
      states: [state({ asset: "BTC" }), state({ asset: "ETH" })],
    });
    render(<SleeveView />);
    expect(screen.getAllByText("cash")).toHaveLength(2);
    expect(
      screen.getByText(/In cash, waiting for the trend/),
    ).toBeInTheDocument();
    // Fictitious framing is always present (JSX splits the text nodes, and
    // the page intro also mentions "fictitious", so match the exact <p>).
    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName === "P" &&
          /of \$1,000(\.00)? fictitious/.test(el.textContent ?? ""),
      ),
    ).toBeInTheDocument();
  });

  it("warns when the last processed bar is more than 2 days old", () => {
    const DAY = 86_400_000;
    withData({
      states: [state({ asset: "BTC", last_time_ms: Date.now() - 3 * DAY })],
    });
    render(<SleeveView />);
    expect(screen.getByRole("status")).toHaveTextContent(/Simulation stalled/);
  });

  it("does not warn when the last bar is fresh (yesterday's close)", () => {
    const DAY = 86_400_000;
    withData({
      states: [state({ asset: "BTC", last_time_ms: Date.now() - DAY })],
    });
    render(<SleeveView />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("formats a partial long exposure as e.g. long 0.42x", () => {
    withData({ states: [state({ asset: "BTC", position: 0.42, units: 0.004 })] });
    render(<SleeveView />);
    expect(screen.getByText("long 0.42x")).toBeInTheDocument();
  });

  it("renders the signal card from the stored snapshot", () => {
    withData({
      states: [state({ asset: "BTC", signal_snapshot: snapshot() })],
    });
    render(<SleeveView />);
    expect(screen.getByText("BTC signals")).toBeInTheDocument();
    // EMA on, Donchian off — literal text labels, not color alone.
    expect(screen.getByText("▲ on")).toBeInTheDocument();
    expect(screen.getByText("▼ off")).toBeInTheDocument();
    expect(screen.getByText("0.35x")).toBeInTheDocument(); // ensemble target
    expect(screen.getByText("0.75x")).toBeInTheDocument(); // vol sizing
    expect(screen.getByText("80%")).toBeInTheDocument(); // realized vol
  });

  it("falls back honestly when the snapshot has not arrived yet", () => {
    withData({ states: [state({ asset: "BTC" })] });
    render(<SleeveView />);
    expect(
      screen.getByText("Signal data arrives with the next daily run."),
    ).toBeInTheDocument();
  });

  it("shows the signal feed's empty state before any flip", () => {
    withData({ states: [state({ asset: "BTC" })] });
    render(<SleeveView />);
    expect(
      screen.getByText("No signal flips recorded yet."),
    ).toBeInTheDocument();
  });

  it("renders a signal event with strategy, direction and reason", () => {
    withData({
      states: [state({ asset: "BTC" })],
      events: [signalEvent()],
    });
    render(<SleeveView />);
    expect(screen.getByText("Donchian")).toBeInTheDocument();
    expect(screen.getByText("▲ entry")).toBeInTheDocument();
    expect(
      screen.getByText(/Donchian breakout — close 69,120/),
    ).toBeInTheDocument();
  });

  it("attributes trades to the decision bar's flip, one day earlier", () => {
    const DAY = 86_400_000;
    const decisionMs = 1_700_000_000_000;
    const trade: SleeveTradeRow = {
      id: "t1",
      user_id: "u1",
      asset: "BTC",
      time_ms: decisionMs + DAY,
      side: "buy",
      price: 69_500,
      units: 0.004,
      position_after: 0.35,
      equity_after: 510,
    };
    withData({
      states: [state({ asset: "BTC" })],
      trades: [trade],
      events: [signalEvent({ time_ms: decisionMs })],
    });
    render(<SleeveView />);
    // The reason appears in both the feed and the trades table.
    expect(
      screen.getAllByText(/Donchian breakout — close 69,120/),
    ).toHaveLength(2);
  });

  it("shows an em dash for trades before event coverage", () => {
    const DAY = 86_400_000;
    const trade: SleeveTradeRow = {
      id: "t1",
      user_id: "u1",
      asset: "BTC",
      time_ms: 1_700_000_000_000 - 10 * DAY,
      side: "buy",
      price: 60_000,
      units: 0.004,
      position_after: 0.3,
      equity_after: 505,
    };
    withData({
      states: [state({ asset: "BTC" })],
      trades: [trade],
      events: [signalEvent()],
    });
    render(<SleeveView />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("isStale", () => {
  const DAY = 86_400_000;
  it("is stale only past 2 days (one bar of slack over the daily cadence)", () => {
    expect(isStale(0, 2 * DAY)).toBe(false);
    expect(isStale(0, 2 * DAY + 1)).toBe(true);
  });
});

describe("toChartSeries", () => {
  it("sums per-asset equity into a combined series ordered by time", () => {
    const rows: SleeveEquityRow[] = [
      { user_id: "u1", asset: "ETH", time_ms: 2, equity: 510 },
      { user_id: "u1", asset: "BTC", time_ms: 1, equity: 500 },
      { user_id: "u1", asset: "BTC", time_ms: 2, equity: 505 },
      { user_id: "u1", asset: "ETH", time_ms: 1, equity: 500 },
    ];
    const series = toChartSeries(rows);
    expect(series.map((p) => p.timeMs)).toEqual([1, 2]);
    expect(series[1]).toMatchObject({ total: 1015, BTC: 505, ETH: 510 });
  });
});
