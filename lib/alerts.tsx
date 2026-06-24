"use client";

import {
  createContext,
  useContext,
  useEffect,
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

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAlerts(JSON.parse(stored) as PriceAlert[]);
      } catch {
        // ignore malformed storage
      }
    }
  }, []);

  const persist = (next: PriceAlert[]): void => {
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
    persist([entry, ...alerts]);
  };

  const remove = (id: string): void => {
    persist(alerts.filter((a) => a.id !== id));
  };

  const markTriggered = (id: string): void => {
    persist(
      alerts.map((a) =>
        a.id === id && a.triggeredAt === null
          ? { ...a, triggeredAt: Date.now() }
          : a,
      ),
    );
  };

  const clearTriggered = (): void => {
    persist(alerts.filter((a) => a.triggeredAt === null));
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
