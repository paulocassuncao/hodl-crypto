/** Map a 0–100 Fear & Greed value to its zone label and theme color var. */
export interface FearGreedZone {
  label: string;
  colorVar: string;
}

export const fearGreedZone = (value: number): FearGreedZone => {
  if (value < 25) return { label: "Extreme Fear", colorVar: "var(--loss)" };
  if (value < 45) return { label: "Fear", colorVar: "oklch(0.7 0.17 50)" };
  if (value < 56) return { label: "Neutral", colorVar: "oklch(0.8 0.16 90)" };
  if (value < 75) return { label: "Greed", colorVar: "oklch(0.75 0.18 140)" };
  return { label: "Extreme Greed", colorVar: "var(--gain)" };
};
