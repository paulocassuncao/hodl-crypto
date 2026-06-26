/** Shared constants for dynamic Open Graph images (next/og ImageResponse). */

export const OG_SIZE = { width: 1200, height: 630 };

export const OG_BG = "#1a1c19";
export const OG_FG = "#fafafa";
export const OG_MUTED = "#a1a1aa";
export const OG_GAIN = "#4ade80";
export const OG_LOSS = "#f87171";
export const OG_BRAND = "#c8e84a";

/** Hex color for a percentage change (Tailwind classes can't be used in OG). */
export const ogChangeColor = (pct: number | null | undefined): string =>
  pct === null || pct === undefined ? OG_MUTED : pct >= 0 ? OG_GAIN : OG_LOSS;
