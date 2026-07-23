"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { PriceAlert } from "@/lib/types";

const STORAGE_KEY = "hodl:alerts";

type NewAlert = Omit<PriceAlert, "id" | "createdAt" | "triggeredAt">;

interface AlertsContextValue {
  alerts: PriceAlert[];
  add: (alert: NewAlert) => void;
  remove: (id: string) => void;
  markTriggered: (id: string) => void;
  clearTriggered: () => void;
}

const AlertsContext = createContext<AlertsContextValue | null>(null);

export const AlertsProvider = ({
  children,
}: {
  children: ReactNode;
}): React.ReactNode => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  // The AlertWatcher marks several alerts triggered in a single tick, before
  // React has re-rendered. Deriving each write from `alerts` would make every
  // call in that batch start from the same pre-batch array, so all but the last
  // would be discarded — a still-`null` triggeredAt re-fires the toast and the
  // system notification on every poll, forever. This ref is the live value.
  const latest = useRef<PriceAlert[]>(alerts);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as PriceAlert[];
        latest.current = parsed;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAlerts(parsed);
      } catch {
        // ignore malformed storage
      }
    }
  }, []);

  /** Apply an update to the newest alerts, then commit it to state + storage. */
  const persist = (update: (prev: PriceAlert[]) => PriceAlert[]): void => {
    const next = update(latest.current);
    latest.current = next;
    setAlerts(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const add = (alert: NewAlert): void => {
    const entry: PriceAlert = {
      ...alert,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      triggeredAt: null,
    };
    persist((prev) => [entry, ...prev]);
  };

  const remove = (id: string): void => {
    persist((prev) => prev.filter((a) => a.id !== id));
  };

  const markTriggered = (id: string): void => {
    persist((prev) =>
      prev.map((a) =>
        a.id === id && a.triggeredAt === null
          ? { ...a, triggeredAt: Date.now() }
          : a,
      ),
    );
  };

  const clearTriggered = (): void => {
    persist((prev) => prev.filter((a) => a.triggeredAt === null));
  };

  return (
    <AlertsContext.Provider
      value={{ alerts, add, remove, markTriggered, clearTriggered }}
    >
      {children}
    </AlertsContext.Provider>
  );
};

export const useAlerts = (): AlertsContextValue => {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error("useAlerts must be used within AlertsProvider");
  return ctx;
};
