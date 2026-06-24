import { heatColor, HEAT_NEUTRAL } from "@/lib/heat";

describe("heatColor", () => {
  it("returns neutral for null/undefined/NaN", () => {
    expect(heatColor(null)).toBe(HEAT_NEUTRAL);
    expect(heatColor(undefined)).toBe(HEAT_NEUTRAL);
    expect(heatColor(Number.NaN)).toBe(HEAT_NEUTRAL);
  });

  it("uses green hue (150) for gains and zero", () => {
    expect(heatColor(0)).toMatch(/^hsl\(150 /);
    expect(heatColor(3.5)).toMatch(/^hsl\(150 /);
  });

  it("uses red hue (0) for losses", () => {
    expect(heatColor(-3.5)).toMatch(/^hsl\(0 /);
  });

  it("saturates at ±8% (larger magnitudes match the cap)", () => {
    expect(heatColor(100)).toBe(heatColor(8));
    expect(heatColor(-100)).toBe(heatColor(-8));
  });

  it("increases saturation with magnitude", () => {
    const small = heatColor(1);
    const large = heatColor(7);
    const satOf = (c: string): number => Number(c.match(/hsl\(\d+ (\d+)%/)![1]);
    expect(satOf(large)).toBeGreaterThan(satOf(small));
  });
});
