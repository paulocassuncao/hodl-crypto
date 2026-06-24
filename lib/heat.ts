/**
 * Color scale for the market heatmap. Maps a percentage change to a tile
 * background color: green for gains, red for losses, with saturation and
 * lightness scaled by magnitude (saturating at ±8%). Returns an HSL string
 * suitable for an inline `fill`/`background` on a dark-text-free tile.
 */

/** Percentage magnitude at which a tile reaches full color intensity. */
const SATURATION_AT = 8;

/** Neutral fill used for missing/zero data. */
export const HEAT_NEUTRAL = "hsl(220 9% 42%)";

export const heatColor = (pct: number | null | undefined): string => {
  if (pct === null || pct === undefined || Number.isNaN(pct)) {
    return HEAT_NEUTRAL;
  }

  const t = Math.min(Math.abs(pct) / SATURATION_AT, 1);

  if (pct >= 0) {
    const saturation = 45 + t * 35; // 45% → 80%
    const lightness = 30 - t * 8; //  30% → 22%
    return `hsl(150 ${saturation.toFixed(0)}% ${lightness.toFixed(0)}%)`;
  }

  const saturation = 50 + t * 35; // 50% → 85%
  const lightness = 32 - t * 8; //  32% → 24%
  return `hsl(0 ${saturation.toFixed(0)}% ${lightness.toFixed(0)}%)`;
};
