"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDexPools } from "@/hooks/use-dex-pools";
import { useMoney, type Money } from "@/hooks/use-money";
import { formatPercent, percentColorClass } from "@/lib/format";
import type { Pool } from "@/lib/types";
import { cn } from "@/lib/utils";

const NETWORKS = [
  { id: "eth", label: "Ethereum" },
  { id: "solana", label: "Solana" },
  { id: "base", label: "Base" },
  { id: "bsc", label: "BNB" },
  { id: "arbitrum", label: "Arbitrum" },
] as const;

/** On-chain DEX pools page: trending / new liquidity pools by network. */
export const DexView = (): React.ReactNode => {
  const [network, setNetwork] = useState<string>("eth");
  const [mode, setMode] = useState<"trending" | "new">("trending");
  const { data, isLoading, isError, error } = useDexPools(network, mode);
  const money = useMoney();

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">On-Chain DEX</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "trending" ? "Trending" : "Newest"} liquidity pools, live
            from GeckoTerminal.
          </p>
        </div>
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "trending" | "new")}
        >
          <TabsList>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="new">New</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={network} onValueChange={setNetwork}>
        <TabsList>
          {NETWORKS.map((n) => (
            <TabsTrigger key={n.id} value={n.id}>
              {n.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Pool</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">24h</TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                24h Volume
              </TableHead>
              <TableHead className="text-right">Liquidity</TableHead>
              <TableHead className="w-8" aria-label="Open" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isError ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  {error instanceof Error
                    ? error.message
                    : "Failed to load pools."}
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : data && data.length > 0 ? (
              data.map((pool) => (
                <PoolRow key={pool.id} pool={pool} money={money} />
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  No pools found for this network.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
};

const PoolRow = ({
  pool,
  money,
}: {
  pool: Pool;
  money: Money;
}): React.ReactNode => (
  <TableRow>
    <TableCell>
      <div className="font-medium">{pool.name}</div>
      <div className="text-xs text-muted-foreground">{pool.dex}</div>
    </TableCell>
    <TableCell className="text-right tabular-nums">
      {money.format(pool.priceUsd)}
    </TableCell>
    <TableCell
      className={cn(
        "text-right tabular-nums",
        percentColorClass(pool.priceChange24h),
      )}
    >
      {formatPercent(pool.priceChange24h)}
    </TableCell>
    <TableCell className="hidden text-right tabular-nums sm:table-cell">
      {money.formatCompact(pool.volume24h)}
    </TableCell>
    <TableCell className="text-right tabular-nums">
      {money.formatCompact(pool.liquidityUsd)}
    </TableCell>
    <TableCell className="text-right">
      <a
        href={`https://www.geckoterminal.com/${pool.network}/pools/${pool.address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="focus-ring inline-flex rounded-md text-muted-foreground hover:text-foreground"
        aria-label={`Open ${pool.name} on GeckoTerminal`}
      >
        <ArrowUpRight className="size-4" />
      </a>
    </TableCell>
  </TableRow>
);
