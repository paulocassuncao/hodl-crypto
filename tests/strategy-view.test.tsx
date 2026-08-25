import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { Providers } from "@/components/providers";
import { StrategyView } from "@/components/strategy/strategy-view";
import { useBacktest } from "@/hooks/use-backtest";
import { useSleeve, useSleeveSignalEvents } from "@/hooks/use-sleeve";

jest.mock("@/hooks/use-sleeve");
jest.mock("@/hooks/use-backtest");
// Both lenses lazy-load a recharts equity chart; neither is under test here.
jest.mock("@/components/sleeve/sleeve-equity-chart.lazy", () => ({
  SleeveEquityChart: (): null => null,
}));
jest.mock("@/components/backtest/backtest-equity-chart.lazy", () => ({
  BacktestEquityChart: (): null => null,
}));

let search = "";
const replace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: jest.fn() }),
  usePathname: () => "/sleeve",
  useSearchParams: () => new URLSearchParams(search),
}));

const setup = (query: string): void => {
  search = query;
  (useSleeve as jest.Mock).mockReturnValue({
    data: { states: [], trades: [], equity: [] },
    isLoading: false,
    error: null,
  });
  (useSleeveSignalEvents as jest.Mock).mockReturnValue({ data: [] });
  (useBacktest as jest.Mock).mockReturnValue({
    data: null,
    isLoading: true,
    error: null,
  });
  render(
    <Providers>
      <StrategyView />
    </Providers>,
  );
};

beforeEach(() => {
  jest.clearAllMocks();
});

/**
 * The fusion's whole point is that Live and Backtest are two views of one
 * strategy, not two strategies. These guard the two ways that can regress:
 * the strategy being described twice, and the lens not surviving the URL.
 */
describe("StrategyView", () => {
  it("states the strategy once, in a single page heading", async () => {
    setup("");
    expect(
      await screen.findByRole("heading", { level: 1, name: "Strategy" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  // The parameters belong to the shared header. A lens repeating them is what
  // made the two screens read as two strategies, so check it in BOTH lenses —
  // the live one alone can't see the backtest drifting back.
  it.each([
    ["live", ""],
    ["backtest", "view=backtest"],
  ])("names the ensemble once in the %s lens", async (_name, query) => {
    setup(query);
    await screen.findByRole("heading", { level: 1, name: "Strategy" });
    expect(screen.getAllByText(/EMA 20\/50\/200/)).toHaveLength(1);
  });

  it("opens on the live sleeve when the URL asks for nothing", async () => {
    setup("");
    expect(await screen.findByRole("tab", { name: "Live" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText(/paper · validating/)).toBeInTheDocument();
  });

  it("opens on the backtest when the URL asks for it", async () => {
    setup("view=backtest");
    expect(
      await screen.findByRole("tab", { name: "Backtest" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/historical · in-sample/)).toBeInTheDocument();
  });

  it("falls back to live for a lens the app does not have", async () => {
    setup("view=bogus");
    expect(await screen.findByRole("tab", { name: "Live" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("writes the lens to the URL, and keeps the default out of it", async () => {
    setup("");
    fireEvent.click(screen.getByRole("tab", { name: "Backtest" }));
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/sleeve?view=backtest", {
        scroll: false,
      }),
    );

    replace.mockClear();
    setup("view=backtest");
    fireEvent.click(screen.getAllByRole("tab", { name: "Live" })[0]);
    // Back to the default: the param goes away rather than reading `view=live`.
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/sleeve", { scroll: false }),
    );
  });

  it("preserves foreign params when the lens changes", async () => {
    setup("ref=email");
    fireEvent.click(screen.getByRole("tab", { name: "Backtest" }));
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/sleeve?ref=email&view=backtest", {
        scroll: false,
      }),
    );
  });
});
