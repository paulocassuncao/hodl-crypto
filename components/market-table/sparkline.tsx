import { memo } from "react";

/**
 * Tiny 7-day price sparkline, colored green/red by overall trend.
 * Memoized: it renders ~100× in the market table, so re-mounting every one on an
 * unrelated parent render (e.g. a filter keystroke) is pure waste. Props are a
 * stable `prices` reference (the coin's own array) plus primitive dimensions.
 */
export const Sparkline = memo(({
  prices,
  width = 130,
  height = 40,
}: {
  prices: number[];
  width?: number;
  height?: number;
}): React.ReactNode => {
  if (!prices || prices.length < 2) {
    return <div style={{ width, height }} aria-hidden="true" />;
  }

  const isUp = prices[prices.length - 1] >= prices[0];
  const color = isUp ? "var(--gain)" : "var(--loss)";

  // Hand-rolled inline SVG instead of a charting library: this renders ~100×
  // in the market table, so a plain <polyline> is dramatically cheaper to mount
  // and re-render than a full chart instance. The line is normalized to the
  // window's own min/max (like a pinned axis) so it fills the cell height and
  // shows real volatility rather than a near-flat line.
  const pad = 2;
  let min = Infinity;
  let max = -Infinity;
  for (const p of prices) {
    if (p < min) min = p;
    if (p > max) max = p;
  }
  const range = max - min || 1;
  const stepX = width / (prices.length - 1);
  const points = prices
    .map((p, i) => {
      const x = i * stepX;
      const y = pad + (1 - (p - min) / range) * (height - pad * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  // Color alone can't convey direction (color blindness, grayscale). The
  // role/label give the 7-day trend a text alternative — on the mobile card
  // this is the only place the 7-day direction appears.
  return (
    <span
      role="img"
      aria-label={`7-day trend, ${isUp ? "up" : "down"}`}
      className="inline-flex"
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
        aria-hidden="true"
      >
        <polyline
          points={points}
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
});
Sparkline.displayName = "Sparkline";
