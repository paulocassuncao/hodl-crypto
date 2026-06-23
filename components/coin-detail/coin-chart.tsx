"use client";

import { useState } from "react";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCoinChart } from "@/hooks/use-coin-chart";
import { useCurrency } from "@/lib/currency";
import { formatCurrency } from "@/lib/format";

const RANGES = [
  { label: "24h", days: 1 },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "1y", days: 365 },
] as const;

/** Interactive price chart with selectable time ranges. */
export const CoinChart = ({ id }: { id: string }): React.ReactNode => {
  const [days, setDays] = useState<number>(7);
  const { currency } = useCurrency();
  const { data, isLoading } = useCoinChart(id, days);

  const isUp =
    data && data.length > 1
      ? data[data.length - 1].price >= data[0].price
      : true;
  const color = isUp ? "var(--gain)" : "var(--loss)";

  const formatTime = (value: number): string =>
    new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(days <= 1 ? { hour: "2-digit" } : {}),
    });

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          Price Chart
        </h2>
        <Tabs
          value={String(days)}
          onValueChange={(v) => setDays(Number(v))}
        >
          <TabsList>
            {RANGES.map((r) => (
              <TabsTrigger key={r.days} value={String(r.days)}>
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-[320px] w-full" />
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tickFormatter={formatTime}
              minTickGap={48}
              tick={{ fontSize: 12 }}
              stroke="var(--muted-foreground)"
            />
            <YAxis
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => formatCurrency(v, currency)}
              width={80}
              tick={{ fontSize: 12 }}
              stroke="var(--muted-foreground)"
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--popover-foreground)",
                fontSize: 12,
              }}
              labelFormatter={(v) => formatTime(Number(v))}
              formatter={(value) => [
                formatCurrency(Number(value), currency),
                "Price",
              ]}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={2}
              fill="url(#priceFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
