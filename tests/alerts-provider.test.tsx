import { act, render } from "@testing-library/react";

import { AlertsProvider, useAlerts } from "@/lib/alerts";
import type { PriceAlert } from "@/lib/types";

const STORAGE_KEY = "hodl:alerts";

/** Mount the provider and hand its context back for direct driving. */
const mountAlerts = (): { current: ReturnType<typeof useAlerts> } => {
  const ref = {} as { current: ReturnType<typeof useAlerts> };
  const Probe = (): null => {
    ref.current = useAlerts();
    return null;
  };
  render(
    <AlertsProvider>
      <Probe />
    </AlertsProvider>,
  );
  return ref;
};

const newAlert = (symbol: string): Omit<
  PriceAlert,
  "id" | "createdAt" | "triggeredAt"
> => ({
  coinId: symbol,
  symbol,
  name: symbol.toUpperCase(),
  image: "",
  direction: "above",
  target: 100,
  currency: "usd",
});

beforeEach(() => {
  window.localStorage.clear();
});

describe("AlertsProvider batched writes", () => {
  it("keeps every alert marked triggered in the same tick", () => {
    const alerts = mountAlerts();
    act(() => {
      alerts.current.add(newAlert("btc"));
      alerts.current.add(newAlert("eth"));
    });
    expect(alerts.current.alerts).toHaveLength(2);

    // Exactly what AlertWatcher does when two alerts cross on the same poll:
    // both markTriggered calls run before React re-renders.
    const [first, second] = alerts.current.alerts;
    act(() => {
      alerts.current.markTriggered(first.id);
      alerts.current.markTriggered(second.id);
    });

    expect(
      alerts.current.alerts.every((a) => a.triggeredAt !== null),
    ).toBe(true);
  });

  it("persists the batched result to localStorage, not just the last write", () => {
    const alerts = mountAlerts();
    act(() => {
      alerts.current.add(newAlert("btc"));
      alerts.current.add(newAlert("eth"));
      alerts.current.add(newAlert("sol"));
    });

    const stored = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "[]",
    ) as PriceAlert[];
    expect(stored.map((a) => a.symbol).sort()).toEqual(["btc", "eth", "sol"]);
  });

  it("survives a removal batched with a trigger", () => {
    const alerts = mountAlerts();
    act(() => {
      alerts.current.add(newAlert("btc"));
      alerts.current.add(newAlert("eth"));
    });
    const [first, second] = alerts.current.alerts;

    act(() => {
      alerts.current.markTriggered(first.id);
      alerts.current.remove(second.id);
    });

    expect(alerts.current.alerts).toHaveLength(1);
    expect(alerts.current.alerts[0].id).toBe(first.id);
    expect(alerts.current.alerts[0].triggeredAt).not.toBeNull();
  });

  it("hydrates from localStorage and batches correctly afterwards", () => {
    const seeded: PriceAlert[] = [
      { ...newAlert("btc"), id: "a1", createdAt: 1, triggeredAt: null },
      { ...newAlert("eth"), id: "a2", createdAt: 2, triggeredAt: null },
    ];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));

    const alerts = mountAlerts();
    expect(alerts.current.alerts).toHaveLength(2);

    act(() => {
      alerts.current.markTriggered("a1");
      alerts.current.markTriggered("a2");
    });
    expect(
      alerts.current.alerts.every((a) => a.triggeredAt !== null),
    ).toBe(true);
  });
});
