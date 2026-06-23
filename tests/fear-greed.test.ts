import { fearGreedZone } from "@/lib/fear-greed";

describe("fearGreedZone", () => {
  it("maps values to the correct zone labels at boundaries", () => {
    expect(fearGreedZone(0).label).toBe("Extreme Fear");
    expect(fearGreedZone(24).label).toBe("Extreme Fear");
    expect(fearGreedZone(25).label).toBe("Fear");
    expect(fearGreedZone(44).label).toBe("Fear");
    expect(fearGreedZone(45).label).toBe("Neutral");
    expect(fearGreedZone(55).label).toBe("Neutral");
    expect(fearGreedZone(56).label).toBe("Greed");
    expect(fearGreedZone(74).label).toBe("Greed");
    expect(fearGreedZone(75).label).toBe("Extreme Greed");
    expect(fearGreedZone(100).label).toBe("Extreme Greed");
  });

  it("provides a color for every zone", () => {
    for (const v of [10, 35, 50, 65, 90]) {
      expect(fearGreedZone(v).colorVar).toMatch(/^(var\(|oklch\()/);
    }
  });
});
