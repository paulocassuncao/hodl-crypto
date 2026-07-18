"use client";

import { CoinIcon } from "@/components/coin-icon";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { useCoins } from "@/hooks/use-coins";
import { useCurrency } from "@/lib/currency";
import {
  formatCompact,
  formatCurrency,
  formatNumber,
  formatPercent,
  percentColorClass,
} from "@/lib/format";
import type { CoinDetail, Currency } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Row {
  label: string;
  render: (md: CoinDetail["market_data"], currency: Currency) => React.ReactNode;
}

const ROWS: Row[] = [
  {
    label: "Price",
    render: (md, c) => formatCurrency(md.current_price[c], c),
  },
  {
    label: "24h %",
    render: (md) => (
      <span className={percentColorClass(md.price_change_percentage_24h ?? 0)}>
        {formatPercent(md.price_change_percentage_24h ?? 0)}
      </span>
    ),
  },
  {
    label: "Market Cap",
    render: (md, c) => formatCompact(md.market_cap[c], c),
  },
  {
    label: "24h Volume",
    render: (md, c) => formatCompact(md.total_volume[c], c),
  },
  {
    label: "All-Time High",
    render: (md, c) => formatCurrency(md.ath[c], c),
  },
  {
    label: "All-Time Low",
    render: (md, c) => formatCurrency(md.atl[c], c),
  },
  {
    label: "Circulating Supply",
    render: (md) =>
      md.circulating_supply === null ? "—" : formatNumber(md.circulating_supply),
  },
  {
    label: "Max Supply",
    render: (md) => (md.max_supply === null ? "∞" : formatNumber(md.max_supply)),
  },
];

/** Side-by-side stats grid, one column per compared coin. */
export const CompareStats = ({ ids }: { ids: string[] }): React.ReactNode => {
  const { currency } = useCurrency();
  const queries = useCoins(ids);

  if (queries.some((q) => q.isLoading)) {
    return <Skeleton className="h-96 w-full rounded-lg" />;
  }

  const coins = queries.map((q) => q.data).filter((c): c is CoinDetail => !!c);
  if (coins.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="p-3 text-left font-medium text-muted-foreground">
              Metric
            </th>
            {coins.map((coin) => (
              <th key={coin.id} className="p-3 text-right">
                <Link
                  href={`/coins/${coin.id}`}
                  className="inline-flex items-center gap-2 hover:underline"
                >
                  <CoinIcon src={coin.image.large} size={20} />
                  <span className="font-semibold">{coin.symbol.toUpperCase()}</span>
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, idx) => (
            <tr
              key={row.label}
              className={cn(idx % 2 === 1 && "bg-muted/20", "border-b last:border-0")}
            >
              <td className="p-3 text-muted-foreground">{row.label}</td>
              {coins.map((coin) => (
                <td key={coin.id} className="p-3 text-right tabular-nums">
                  {row.render(coin.market_data, currency)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
