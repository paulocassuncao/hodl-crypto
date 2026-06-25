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
  if (score === "yellow") return "bg-warning";
  if (score === "red") return "bg-loss";
  return "bg-muted-foreground/40";
};

/** Exchange trust-score indicator dot, shared by the table and mobile card. */
const TrustDot = ({ score }: { score: string | null }): React.ReactNode => (
  <span
    className={cn("inline-block size-2.5 rounded-full", trustDotClass(score))}
    title={`Trust: ${score ?? "unknown"}`}
  />
);

/** "Trade" link out to the exchange, or an em dash when no URL is offered. */
const TradeLink = ({ url }: { url: string | null }): React.ReactNode =>
  url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
    >
      Trade
      <ExternalLink className="size-3" />
    </a>
  ) : (
    <span className="text-muted-foreground">—</span>
  );

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

      {/* Mobile: stacked cards instead of a horizontally scrolling table. */}
      <ul className="space-y-2 md:hidden">
        {tickers.map((t, i) => (
          <li
            key={`${t.exchange}-${t.base}-${t.target}-${i}`}
            className="rounded-lg border bg-card p-3"
          >
            <div className="flex items-center gap-2">
              {showTrust ? <TrustDot score={t.trustScore} /> : null}
              <span className="min-w-0 truncate font-medium">{t.exchange}</span>
              <span className="ml-auto shrink-0 text-xs uppercase text-muted-foreground">
                {t.base}/{t.target}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                <span className="tabular-nums text-foreground">
                  {t.price === null ? "—" : formatCurrency(t.price, "usd")}
                </span>
                {" · Vol "}
                <span className="tabular-nums">
                  {t.volume === null ? "—" : formatCompact(t.volume, "usd")}
                </span>
              </div>
              <TradeLink url={t.tradeUrl} />
            </div>
          </li>
        ))}
      </ul>

      {/* md+: full markets table. */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
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
                      <TrustDot score={t.trustScore} />
                    </span>
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <TradeLink url={t.tradeUrl} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
