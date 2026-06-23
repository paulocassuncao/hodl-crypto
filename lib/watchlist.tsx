"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "hodl:watchlist";

interface WatchlistContextValue {
  ids: Set<string>;
  isWatched: (id: string) => boolean;
  toggle: (id: string) => void;
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

/** Provides the set of favorited coin ids, persisted to localStorage. */
export const WatchlistProvider = ({
  children,
}: {
  children: ReactNode;
}): ReactNode => {
  const [ids, setIds] = useState<Set<string>>(new Set());

  // Hydrate from localStorage after mount (window is unavailable during SSR).
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIds(new Set(JSON.parse(stored) as string[]));
      } catch {
        // ignore malformed storage
      }
    }
  }, []);

  const toggle = (id: string): void => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <WatchlistContext.Provider
      value={{ ids, isWatched: (id) => ids.has(id), toggle }}
    >
      {children}
    </WatchlistContext.Provider>
  );
};

/** Read/update the favorited coin set. */
export const useWatchlist = (): WatchlistContextValue => {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error("useWatchlist must be used within a WatchlistProvider");
  }
  return ctx;
};
