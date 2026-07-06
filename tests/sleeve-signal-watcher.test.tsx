import { render } from "@testing-library/react";
import { toast } from "sonner";

import { SleeveSignalWatcher } from "@/components/sleeve/sleeve-signal-watcher";
import { useSleeveSignalEvents } from "@/hooks/use-sleeve";
import { notify } from "@/lib/notify";
import { SIGNALS_SEEN_KEY } from "@/lib/sleeve-signals";
import type { SleeveSignalEventRow } from "@/lib/supabase/types";

jest.mock("@/hooks/use-sleeve");
jest.mock("@/lib/notify");
jest.mock("sonner", () => ({ toast: jest.fn() }));

const mockUseSleeveSignalEvents = useSleeveSignalEvents as jest.Mock;
const mockToast = toast as unknown as jest.Mock;
const mockNotify = notify as jest.Mock;

const DAY = 86_400_000;
const T0 = 1_700_000_000_000;

const event = (
  over: Partial<SleeveSignalEventRow> = {},
): SleeveSignalEventRow => ({
  id: "e1",
  user_id: "u1",
  asset: "BTC",
  time_ms: T0,
  strategy: "donchian",
  signal_before: 0,
  signal_after: 1,
  reason: "Donchian breakout — close 69,120 above the 20-day high 68,900",
  context: {},
  created_at: "2026-07-01T00:00:00Z",
  ...over,
});

const withEvents = (events: SleeveSignalEventRow[]): void => {
  mockUseSleeveSignalEvents.mockReturnValue({
    data: events,
    isLoading: false,
    error: null,
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe("SleeveSignalWatcher", () => {
  it("first-ever load: sets the watermark silently, no toast flood", () => {
    withEvents([event(), event({ id: "e2", time_ms: T0 + DAY })]);
    render(<SleeveSignalWatcher />);
    expect(mockToast).not.toHaveBeenCalled();
    expect(mockNotify).not.toHaveBeenCalled();
    expect(localStorage.getItem(SIGNALS_SEEN_KEY)).toBe(String(T0 + DAY));
  });

  it("fires exactly one toast + notification per fresh event", () => {
    localStorage.setItem(SIGNALS_SEEN_KEY, String(T0));
    withEvents([event(), event({ id: "e2", time_ms: T0 + DAY })]);
    render(<SleeveSignalWatcher />);
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(
      "Sleeve signal: BTC — Donchian entry",
      { description: expect.stringContaining("Donchian breakout") },
    );
    expect(mockNotify).toHaveBeenCalledTimes(1);
    expect(mockNotify).toHaveBeenCalledWith(
      "HODL · Sleeve BTC",
      expect.stringContaining("Donchian breakout"),
      "/sleeve",
    );
    expect(localStorage.getItem(SIGNALS_SEEN_KEY)).toBe(String(T0 + DAY));
  });

  it("does not re-fire once the watermark is up to date", () => {
    localStorage.setItem(SIGNALS_SEEN_KEY, String(T0));
    const events = [event(), event({ id: "e2", time_ms: T0 + DAY })];
    withEvents(events);
    const { unmount } = render(<SleeveSignalWatcher />);
    expect(mockToast).toHaveBeenCalledTimes(1);
    unmount();
    render(<SleeveSignalWatcher />);
    expect(mockToast).toHaveBeenCalledTimes(1);
  });

  it("labels exits as such", () => {
    localStorage.setItem(SIGNALS_SEEN_KEY, String(T0 - DAY));
    withEvents([
      event({
        strategy: "ema_trend",
        signal_before: 1,
        signal_after: 0,
        reason: "EMA trend off — EMA20 fell below EMA50",
      }),
    ]);
    render(<SleeveSignalWatcher />);
    expect(mockToast).toHaveBeenCalledWith(
      "Sleeve signal: BTC — EMA trend exit",
      { description: expect.stringContaining("EMA trend off") },
    );
  });

  it("does nothing while the query has no data", () => {
    mockUseSleeveSignalEvents.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    render(<SleeveSignalWatcher />);
    expect(mockToast).not.toHaveBeenCalled();
    expect(localStorage.getItem(SIGNALS_SEEN_KEY)).toBeNull();
  });
});
