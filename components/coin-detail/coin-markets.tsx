"use client";

import { ExternalLink } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCoinTickers } from "@/hooks/use-coin-tickers";
import { formatCompact, formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const trustDotClass = (score: string | null): string => {
  if (score === "green") return "bg-gain";
  if (score === "yellow") return "bg-yellow-500";
  if (score === "red") return "bg-loss";
  return "bg-muted-foreground/40";
};

/** Markets (exchanges) table for a coin. Prices/volume shown in USD. */
export const CoinMarkets = ({ id }: { id: string }): React.ReactNode => {
  const { data: tickers, isLoading, isError, error } = useCoinTickers(id);

  if (isError) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        {error instanceof Error ? error.message : "Failed to load markets."}
      </div>
    );
  }

  if (isLoading || !tickers) {
    return <Skeleton className="h-80 w-full rounded-lg" />;
  }

  if (tickers.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        No markets found for this coin.
      </div>
    );
  }

  // CoinGecko's Demo plan returns no trust scores, so hide the column entirely
  // when every ticker is unknown rather than show a wall of gray dots.
  const showTrust = tickers.some((t) => t.trustScore !== null);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Top {tickers.length} markets · prices &amp; volume in USD
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Exchange</TableHead>
              <TableHead>Pair</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Volume (24h)</TableHead>
              {showTrust && <TableHead className="text-center">Trust</TableHead>}
              <TableHead className="text-right">Trade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickers.map((t, i) => (
              <TableRow key={`${t.exchange}-${t.base}-${t.target}-${i}`}>
                <TableCell className="font-medium">{t.exchange}</TableCell>
                <TableCell className="uppercase text-muted-foreground">
                  {t.base}/{t.target}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {t.price === null ? "—" : formatCurrency(t.price, "usd")}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {t.volume === null ? "—" : formatCompact(t.volume, "usd")}
                </TableCell>
                {showTrust && (
                  <TableCell>
                    <span className="flex justify-center">
                      <span
                        className={cn(
                          "inline-block size-2.5 rounded-full",
                          trustDotClass(t.trustScore),
                        )}
                        title={t.trustScore ?? "unknown"}
                      />
                    </span>
                  </TableCell>
                )}
                <TableCell className="text-right">
                  {t.tradeUrl ? (
                    <a
                      href={t.tradeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      Trade
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
