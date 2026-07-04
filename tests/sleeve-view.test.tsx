import { render, screen } from "@testing-library/react";

import { SleeveView } from "@/components/sleeve/sleeve-view";
import { toChartSeries } from "@/components/sleeve/sleeve-equity-chart";
import { useSleeve } from "@/hooks/use-sleeve";
import type {
  SleeveEquityRow,
  SleeveStateRow,
  SleeveTradeRow,
} from "@/lib/supabase/types";

jest.mock("@/hooks/use-sleeve");
const mockUseSleeve = useSleeve as jest.Mock;

const state = (over: Partial<SleeveStateRow>): SleeveStateRow => ({
  user_id: "u1",
  asset: "BTC",
  cash: 500,
  units: 0,
  position: 0,
  last_time_ms: 1_700_000_000_000,
  allocation: 500,
  target_vol: 0.6,
  ...over,
});

const withData = (data: {
  states?: SleeveStateRow[];
  trades?: SleeveTradeRow[];
  equity?: SleeveEquityRow[];
}): void => {
  mockUseSleeve.mockReturnValue({
    data: { states: [], trades: [], equity: [], ...data },
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

  it("formats a partial long exposure as e.g. long 0.42x", () => {
    withData({ states: [state({ asset: "BTC", position: 0.42, units: 0.004 })] });
    render(<SleeveView />);
    expect(screen.getByText("long 0.42x")).toBeInTheDocument();
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
