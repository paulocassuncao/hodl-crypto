"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCoinChart } from "@/lib/api";
import { simulateDca } from "@/lib/dca";
import { formatCurrency, formatPercent, percentColorClass } from "@/lib/format";
import type { Position } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DcaDialogProps {
  positions: Position[];
}

const FREQUENCIES = [
  { label: "Weekly", days: 7 },
  { label: "Bi-weekly", days: 14 },
  { label: "Monthly", days: 30 },
] as const;

const RANGES = [
  { label: "90d", days: 90 },
  { label: "180d", days: 180 },
  { label: "1y", days: 365 },
] as const;

/** Backtest dollar-cost averaging into a held coin over a historical window. */
export const DcaDialog = ({ positions }: DcaDialogProps): React.ReactNode => {
  const [coinId, setCoinId] = useState(positions[0]?.coinId ?? "");
  const [amount, setAmount] = useState("100");
  const [freqDays, setFreqDays] = useState<number>(30);
  const [rangeDays, setRangeDays] = useState<number>(365);

  // Portfolio math is USD-only, so backtest in USD regardless of display currency.
  const { data: series, isLoading } = useQuery({
    queryKey: ["dca-chart", coinId, rangeDays],
    queryFn: () => fetchCoinChart(coinId, rangeDays, "usd"),
    enabled: coinId !== "",
  });

  const perBuy = Number(amount);
  const result =
    series && perBuy > 0 && Number.isFinite(perBuy)
      ? simulateDca(series, perBuy, freqDays)
      : null;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1">
            <CalendarClock className="size-4" />
            <span className="hidden sm:inline">DCA backtest</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>DCA backtest</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Coin</span>
              <select
                value={coinId}
                onChange={(e) => setCoinId(e.target.value)}
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              >
                {positions.map((p) => (
                  <option key={p.coinId} value={p.coinId}>
                    {p.name} ({p.symbol.toUpperCase()})
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">
                Amount per buy (USD)
              </span>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-muted-foreground">Frequency</span>
              <div className="flex gap-1 rounded-md border p-1">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f.days}
                    type="button"
                    onClick={() => setFreqDays(f.days)}
                    className={cn(
                      "rounded px-2 py-0.5 font-medium transition-colors",
                      freqDays === f.days
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-pressed={freqDays === f.days}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Window</span>
              <div className="flex gap-1 rounded-md border p-1">
                {RANGES.map((r) => (
                  <button
                    key={r.days}
                    type="button"
                    onClick={() => setRangeDays(r.days)}
                    className={cn(
                      "rounded px-2 py-0.5 font-medium transition-colors",
                      rangeDays === r.days
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-pressed={rangeDays === r.days}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : result ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart
                  data={series}
                  margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
                >
                  <defs>
                    <linearGradient id="dcaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="var(--chart-1)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--chart-1)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" hide />
                  <YAxis domain={["auto", "auto"]} hide />
                  <ReferenceLine
                    y={result.avgCost}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="4 4"
                    label={{
                      value: "avg cost",
                      position: "insideTopLeft",
                      fontSize: 10,
                      fill: "var(--muted-foreground)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="var(--chart-1)"
                    strokeWidth={1.5}
                    fill="url(#dcaFill)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>

              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border text-sm">
                {[
                  { label: "Invested", value: formatCurrency(result.invested, "usd") },
                  { label: "Buys", value: String(result.buys) },
                  {
                    label: "Final value",
                    value: formatCurrency(result.finalValue, "usd"),
                  },
                  { label: "Avg cost", value: formatCurrency(result.avgCost, "usd") },
                ].map((s) => (
                  <div key={s.label} className="bg-card p-2.5">
                    <dt className="text-xs text-muted-foreground">{s.label}</dt>
                    <dd className="tabular-nums">{s.value}</dd>
                  </div>
                ))}
                <div className="bg-card p-2.5">
                  <dt className="text-xs text-muted-foreground">DCA return</dt>
                  <dd
                    className={cn(
                      "tabular-nums",
                      percentColorClass(result.roiPct),
                    )}
                  >
                    {formatPercent(result.roiPct)}
                  </dd>
                </div>
                <div className="bg-card p-2.5">
                  <dt className="text-xs text-muted-foreground">
                    Lump sum return
                  </dt>
                  <dd
                    className={cn(
                      "tabular-nums",
                      percentColorClass(result.lumpSumRoiPct),
                    )}
                  >
                    {formatPercent(result.lumpSumRoiPct)}
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">
                Hypothetical: buys {formatCurrency(perBuy, "usd")} every{" "}
                {freqDays} days over the window. Past performance isn&apos;t
                indicative of future results.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Couldn&apos;t load price history for this coin.
            </p>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Close</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
