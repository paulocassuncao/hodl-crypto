/**
 * Pure geometry/color helpers for rendering OHLC candlesticks.
 *
 * Recharts has no native candlestick, so we draw each candle as a custom shape
 * on a range `Bar` whose value spans `[low, high]`. Recharts hands the shape a
 * pixel rect where the top (`y`) maps to the candle's high and the bottom
 * (`y + height`) maps to its low; these helpers turn OHLC values into the wick
 * and body pixel coordinates. Kept free of React/Recharts so it can be unit-tested.
 */

/** Up (close ≥ open) and down candle colors, matching the app's gain/loss tokens. */
export const CANDLE_UP = "var(--gain)";
export const CANDLE_DOWN = "var(--loss)";

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Pixel rect Recharts provides for a range bar spanning [low, high]. */
export interface CandleRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CandleGeometry {
  isUp: boolean;
  color: string;
  /** Center x of the wick/body. */
  wickX: number;
  /** Y of the high (top of wick). */
  wickTop: number;
  /** Y of the low (bottom of wick). */
  wickBottom: number;
  bodyX: number;
  bodyY: number;
  bodyWidth: number;
  bodyHeight: number;
}

/** A candle is up (green) when it closed at or above its open. */
export const isUpCandle = (candle: Candle): boolean =>
  candle.close >= candle.open;

/** Color token for a candle based on direction. */
export const candleColor = (candle: Candle): string =>
  isUpCandle(candle) ? CANDLE_UP : CANDLE_DOWN;

/**
 * Map an OHLC value to a pixel Y within the bar's range, where `high` maps to
 * `y` (top) and `low` maps to `y + height` (bottom). Returns `y` for a flat
 * candle (high === low) to avoid division by zero.
 */
export const valueToY = (
  value: number,
  high: number,
  low: number,
  y: number,
  height: number,
): number => {
  if (high === low) return y;
  const ratio = (high - value) / (high - low);
  return y + ratio * height;
};

/**
 * Compute wick and body pixel coordinates for a candle within its bar rect.
 * `bodyWidthRatio` narrows the body relative to the slot width; `minBodyHeight`
 * keeps doji (open === close) candles visible as a thin line.
 */
export const candleGeometry = (
  candle: Candle,
  rect: CandleRect,
  bodyWidthRatio = 0.6,
  minBodyHeight = 1,
): CandleGeometry => {
  const { open, high, low, close } = candle;
  const { x, y, width, height } = rect;
  const wickX = x + width / 2;
  const top = valueToY(Math.max(open, close), high, low, y, height);
  const bottom = valueToY(Math.min(open, close), high, low, y, height);
  const bodyWidth = Math.max(width * bodyWidthRatio, 1);
  return {
    isUp: isUpCandle(candle),
    color: candleColor(candle),
    wickX,
    wickTop: y,
    wickBottom: y + height,
    bodyX: wickX - bodyWidth / 2,
    bodyY: top,
    bodyWidth,
    bodyHeight: Math.max(bottom - top, minBodyHeight),
  };
};

/** Y-axis domain padded slightly beyond the min low / max high of a series. */
export const candleDomain = (
  candles: Candle[],
  pad = 0.02,
): [number, number] => {
  if (candles.length === 0) return [0, 0];
  let lo = Infinity;
  let hi = -Infinity;
  for (const c of candles) {
    if (c.low < lo) lo = c.low;
    if (c.high > hi) hi = c.high;
  }
  const span = hi - lo || hi || 1;
  return [lo - span * pad, hi + span * pad];
};
