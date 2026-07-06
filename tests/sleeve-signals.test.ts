import { reasonForTrade, splitFreshEvents } from "@/lib/sleeve-signals";
import type { SleeveSignalEventRow } from "@/lib/supabase/types";

const DAY = 86_400_000;
const T0 = 1_700_000_000_000;

const event = (
  overrides: Partial<SleeveSignalEventRow> = {},
): SleeveSignalEventRow => ({
  id: "e1",
  user_id: "u1",
  asset: "BTC",
  time_ms: T0,
  strategy: "donchian",
  signal_before: 0,
  signal_after: 1,
  reason: "Donchian breakout — close 130 above the 20-day high 101",
  context: {},
  created_at: "2026-07-01T00:00:00Z",
  ...overrides,
});

describe("reasonForTrade", () => {
  it("joins the trade to events at time_ms − 1 day", () => {
    const events = [event()];
    expect(reasonForTrade({ asset: "BTC", time_ms: T0 + DAY }, events)).toBe(
      events[0].reason,
    );
  });

  it("concatenates multiple strategies' reasons, donchian first", () => {
    const events = [
      event({ id: "e2", strategy: "ema_trend", reason: "EMA trend on" }),
      event({ id: "e1", strategy: "donchian", reason: "Donchian breakout" }),
    ];
    expect(reasonForTrade({ asset: "BTC", time_ms: T0 + DAY }, events)).toBe(
      "Donchian breakout · EMA trend on",
    );
  });

  it("does not match another asset's events", () => {
    const events = [event({ asset: "ETH" })];
    expect(
      reasonForTrade({ asset: "BTC", time_ms: T0 + DAY }, events),
    ).toBeNull();
  });

  it("labels in-coverage trades with no flip as vol resize", () => {
    const events = [event()];
    expect(
      reasonForTrade({ asset: "BTC", time_ms: T0 + 5 * DAY }, events),
    ).toBe("Vol resize / rebalance");
  });

  it("returns null for trades before event coverage", () => {
    const events = [event()];
    expect(
      reasonForTrade({ asset: "BTC", time_ms: T0 - 5 * DAY }, events),
    ).toBeNull();
  });

  it("returns null when there are no events at all", () => {
    expect(reasonForTrade({ asset: "BTC", time_ms: T0 + DAY }, [])).toBeNull();
  });
});

describe("splitFreshEvents", () => {
  const events = [
    event({ id: "new", time_ms: T0 + 2 * DAY }),
    event({ id: "mid", time_ms: T0 + DAY }),
    event({ id: "old", time_ms: T0 }),
  ];

  it("first-ever load: nothing fresh, watermark jumps to the newest event", () => {
    const { fresh, watermark } = splitFreshEvents(events, null);
    expect(fresh).toEqual([]);
    expect(watermark).toBe(T0 + 2 * DAY);
  });

  it("returns only events past the watermark, oldest-first", () => {
    const { fresh, watermark } = splitFreshEvents(events, T0);
    expect(fresh.map((e) => e.id)).toEqual(["mid", "new"]);
    expect(watermark).toBe(T0 + 2 * DAY);
  });

  it("does not re-fire at an up-to-date watermark", () => {
    const { fresh, watermark } = splitFreshEvents(events, T0 + 2 * DAY);
    expect(fresh).toEqual([]);
    expect(watermark).toBe(T0 + 2 * DAY);
  });

  it("keeps the watermark when the event list is empty", () => {
    expect(splitFreshEvents([], T0)).toEqual({ fresh: [], watermark: T0 });
    expect(splitFreshEvents([], null)).toEqual({ fresh: [], watermark: null });
  });

  it("never lowers a watermark that is ahead of the data", () => {
    const { watermark } = splitFreshEvents(events, T0 + 9 * DAY);
    expect(watermark).toBe(T0 + 9 * DAY);
  });
});
