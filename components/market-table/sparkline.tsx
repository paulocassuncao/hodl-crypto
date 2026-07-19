import { memo, useId } from "react";

/**
 * Tiny 7-day price sparkline, colored green/red by trend and lit like the rest
 * of the atmosphere: a drained area fill under a glowing stroke, an emphasized
 * end-point, and a one-time draw-in on mount (see `.spark-line` / `.spark-area`
 * in globals.css, both frozen under prefers-reduced-motion).
 *
 * Memoized: it renders ~100× in the market table, so re-mounting every one on an
 * unrelated parent render (e.g. a filter keystroke) is pure waste. Props are a
 * stable `prices` reference (the coin's own array) plus primitive dimensions.
 */
export const Sparkline = memo(({
  prices,
  width = 130,
  height = 40,
  color: colorOverride,
}: {
  prices: number[];
  width?: number;
  height?: number;
  /**
   * Force the stroke/fill color instead of deriving it from the line's own
   * up/down direction. Used by the Portfolio hero, where the line must agree
   * with the P&L sign (a value line that trended up 7d while you're down since
   * cost would otherwise glow green behind a red loss — a mixed signal).
   */
  color?: string;
}): React.ReactNode => {
  const gradientId = useId();

  if (!prices || prices.length < 2) {
    return <div style={{ width, height }} aria-hidden="true" />;
  }

  const isUp = prices[prices.length - 1] >= prices[0];
  const color = colorOverride ?? (isUp ? "var(--gain)" : "var(--loss)");

  // Hand-rolled inline SVG instead of a charting library: this renders ~100× in
  // the market table, so plain SVG primitives are dramatically cheaper to mount
  // than a full chart instance. Normalized to the window's own min/max (like a
  // pinned axis) so it fills the cell height and shows real volatility.
  const pad = 3;
  let min = Infinity;
  let max = -Infinity;
  for (const p of prices) {
    if (p < min) min = p;
    if (p > max) max = p;
  }
  const range = max - min || 1;
  const stepX = width / (prices.length - 1);
  const pts = prices.map((p, i) => {
    const x = i * stepX;
    const y = pad + (1 - (p - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });
  const linePoints = pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const areaPoints = `0,${height} ${linePoints} ${width},${height}`;
  const [endX, endY] = pts[pts.length - 1];

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
        style={{ color, overflow: "visible" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          className="spark-area"
          points={areaPoints}
          fill={`url(#${gradientId})`}
        />
        <polyline
          className="spark-line"
          points={linePoints}
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          style={{ filter: "drop-shadow(0 0 3px currentColor)" }}
        />
        <circle
          cx={endX}
          cy={endY}
          r={2}
          fill="currentColor"
          style={{ filter: "drop-shadow(0 0 4px currentColor)" }}
        />
      </svg>
    </span>
  );
});
Sparkline.displayName = "Sparkline";
