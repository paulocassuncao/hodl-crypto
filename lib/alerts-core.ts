import type { AlertDirection } from "@/lib/types";

/**
 * Whether a price has crossed an alert threshold. "above" fires when the
 * price reaches or exceeds the target; "below" when it reaches or drops under.
 */
export const isCrossed = (
  direction: AlertDirection,
  target: number,
  price: number,
): boolean => (direction === "above" ? price >= target : price <= target);
