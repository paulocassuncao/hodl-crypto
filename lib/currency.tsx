"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { Currency } from "@/lib/types";

/** Selectable display currencies and their UI metadata. */
export const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "usd", label: "USD" },
  { value: "eur", label: "EUR" },
  { value: "gbp", label: "GBP" },
  { value: "jpy", label: "JPY" },
  { value: "btc", label: "BTC" },
  { value: "eth", label: "ETH" },
];

const STORAGE_KEY = "hodl:currency";

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

/** Provides the active display currency, persisted to localStorage. */
export const CurrencyProvider = ({
  children,
}: {
  children: ReactNode;
}): ReactNode => {
  const [currency, setCurrencyState] = useState<Currency>("usd");

  // Hydrate from localStorage after mount (window is unavailable during SSR).
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Currency | null;
    if (stored && CURRENCIES.some((c) => c.value === stored)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrencyState(stored);
    }
  }, []);

  const setCurrency = (next: Currency): void => {
    setCurrencyState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

/** Read/update the active display currency. */
export const useCurrency = (): CurrencyContextValue => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return ctx;
};
