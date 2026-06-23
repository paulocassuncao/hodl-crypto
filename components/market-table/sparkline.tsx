"use client";

import { Line, LineChart, YAxis } from "recharts";

/** Tiny 7-day price sparkline, colored green/red by overall trend. */
export const Sparkline = ({
  prices,
  width = 130,
  height = 40,
}: {
  prices: number[];
  width?: number;
  height?: number;
}): React.ReactNode => {
  if (!prices || prices.length < 2) {
    return <div style={{ width, height }} />;
  }

  const isUp = prices[prices.length - 1] >= prices[0];
  const color = isUp ? "var(--gain)" : "var(--loss)";
  const data = prices.map((price, index) => ({ index, price }));

  return (
    <LineChart
      width={width}
      height={height}
      data={data}
      margin={{ top: 2, bottom: 2, left: 0, right: 0 }}
    >
      {/* Hidden axis pinned to the data range so the line fills the cell's
          height and reflects real volatility instead of a near-flat line. */}
      <YAxis hide domain={["dataMin", "dataMax"]} />
      <Line
        type="monotone"
        dataKey="price"
        stroke={color}
        strokeWidth={1.5}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  );
};
