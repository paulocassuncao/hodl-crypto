"use client";

import { useState, type ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

import { AlertWatcher } from "@/components/alerts/alert-watcher";
import { Toaster } from "@/components/ui/sonner";
import { AlertsProvider } from "@/lib/alerts";
import { CurrencyProvider } from "@/lib/currency";
import { PortfolioProvider } from "@/lib/portfolio";
import { WatchlistProvider } from "@/lib/watchlist";

/** App-wide client providers: React Query, theme, currency, and toasts. */
export const Providers = ({ children }: { children: ReactNode }): ReactNode => {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <CurrencyProvider>
          <WatchlistProvider>
            <PortfolioProvider>
              <AlertsProvider>
                {children}
                <AlertWatcher />
                <Toaster richColors position="top-right" />
              </AlertsProvider>
            </PortfolioProvider>
          </WatchlistProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
