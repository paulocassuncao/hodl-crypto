import { heatColor, HEAT_NEUTRAL } from "@/lib/heat";

describe("heatColor", () => {
  it("returns neutral for null/undefined/NaN", () => {
    expect(heatColor(null)).toBe(HEAT_NEUTRAL);
    expect(heatColor(undefined)).toBe(HEAT_NEUTRAL);
    expect(heatColor(Number.NaN)).toBe(HEAT_NEUTRAL);
  });

  it("uses the brand gain hue (152) for gains and zero", () => {
    expect(heatColor(0)).toMatch(/ 152\)$/);
    expect(heatColor(3.5)).toMatch(/ 152\)$/);
  });

  it("uses the brand loss hue (25) for losses", () => {
    expect(heatColor(-3.5)).toMatch(/ 25\)$/);
  });

  it("saturates at ±8% (larger magnitudes match the cap)", () => {
    expect(heatColor(100)).toBe(heatColor(8));
    expect(heatColor(-100)).toBe(heatColor(-8));
  });

  it("increases chroma with magnitude", () => {
    const small = heatColor(1);
    const large = heatColor(7);
    const chromaOf = (c: string): number =>
      Number(c.match(/oklch\([\d.]+ ([\d.]+) /)![1]);
    expect(chromaOf(large)).toBeGreaterThan(chromaOf(small));
  });
});
