/** Map a 0–100 Fear & Greed value to its zone label and theme color var. */
export interface FearGreedZone {
  label: string;
  colorVar: string;
}

export const fearGreedZone = (value: number): FearGreedZone => {
  if (value < 25) return { label: "Extreme Fear", colorVar: "var(--loss)" };
  if (value < 45) return { label: "Fear", colorVar: "var(--fg-fear)" };
  if (value < 56) return { label: "Neutral", colorVar: "var(--fg-neutral)" };
  if (value < 75) return { label: "Greed", colorVar: "var(--fg-greed)" };
  return { label: "Extreme Greed", colorVar: "var(--gain)" };
};
