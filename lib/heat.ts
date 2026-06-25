/**
 * Color scale for the market heatmap. Maps a percentage change to a tile fill:
 * green for gains, red for losses, deepening with magnitude (saturating at ±8%).
 *
 * Uses the brand's own gain/loss hues — OKLCH 152°/25°, matching the `--gain`
 * and `--loss` tokens — so the heatmap speaks the same color language as the
 * rest of the app. The lightness sits below those tokens on purpose: tiles
 * carry fixed white labels, so the field must stay dark enough for AA contrast
 * in both themes. Chroma and lightness both scale with magnitude.
 */

/** Percentage magnitude at which a tile reaches full color intensity. */
const SATURATION_AT = 8;

/** Neutral fill used for missing/zero data — graphite tinted toward the brand hue. */
export const HEAT_NEUTRAL = "oklch(0.42 0.015 145)";

export const heatColor = (pct: number | null | undefined): string => {
  if (pct === null || pct === undefined || Number.isNaN(pct)) {
    return HEAT_NEUTRAL;
  }

  const t = Math.min(Math.abs(pct) / SATURATION_AT, 1);

  if (pct >= 0) {
    const lightness = 0.42 - t * 0.06; // 0.42 → 0.36
    const chroma = 0.09 + t * 0.06; //   0.09 → 0.15 (brand gain hue 152)
    return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} 152)`;
  }

  const lightness = 0.44 - t * 0.06; // 0.44 → 0.38
  const chroma = 0.11 + t * 0.08; //   0.11 → 0.19 (brand loss hue 25)
  return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} 25)`;
};
