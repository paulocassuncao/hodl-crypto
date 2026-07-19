"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFearGreed } from "@/hooks/use-fear-greed";
import { fearGreedZone } from "@/lib/fear-greed";

/** Semicircular gauge for the crypto Fear & Greed index. */
export const FearGreedGauge = (): React.ReactNode => {
  const { data, isLoading } = useFearGreed();
  const zone = data ? fearGreedZone(data.value) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fear &amp; Greed</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !data || !zone ? (
          <Skeleton className="mx-auto h-[120px] w-full" />
        ) : (
          <div
            className="fg-gauge relative"
            role="img"
            aria-label={`Fear & Greed index: ${data.value} out of 100 — ${zone.label}`}
            style={{ "--fg-glow": zone.colorVar } as React.CSSProperties}
          >
            <ResponsiveContainer width="100%" height={130}>
              <RadialBarChart
                data={[{ value: data.value, fill: zone.colorVar }]}
                startAngle={180}
                endAngle={0}
                innerRadius="70%"
                outerRadius="100%"
                barSize={14}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                {/*
                 * The value arc carries the state — it lights in the zone color
                 * (see `.fg-gauge` in globals.css). The empty track is a quiet
                 * muted ring, never brighter than the fill (was the recharts
                 * default near-white, which inverted the gauge's emphasis).
                 */}
                <RadialBar
                  background={{ fill: "var(--muted)" }}
                  dataKey="value"
                  cornerRadius={8}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex flex-col items-center">
              <span
                className="text-3xl font-bold tabular-nums"
                style={{ color: zone.colorVar }}
              >
                {data.value}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {zone.label}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
