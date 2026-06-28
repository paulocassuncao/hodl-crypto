"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

interface AllocationSlice {
  coinId: string;
  value: number;
}

/**
 * 120×120 allocation donut. Split into its own module so recharts loads as a
 * deferred chunk — the portfolio's headline totals and legend paint immediately
 * and never wait on the charting library.
 */
export const PortfolioAllocationDonut = ({
  data,
  colors,
}: {
  data: AllocationSlice[];
  colors: string[];
}): React.ReactNode => (
  <ResponsiveContainer width={120} height={120}>
    <PieChart>
      <Pie
        data={data}
        dataKey="value"
        nameKey="coinId"
        innerRadius={38}
        outerRadius={58}
        strokeWidth={0}
        isAnimationActive={false}
      >
        {data.map((a, i) => (
          <Cell key={a.coinId} fill={colors[i % colors.length]} />
        ))}
      </Pie>
    </PieChart>
  </ResponsiveContainer>
);
