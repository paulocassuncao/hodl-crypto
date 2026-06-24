import { isCrossed } from "@/lib/alerts-core";

describe("isCrossed", () => {
  describe("above", () => {
    it("fires when price exceeds the target", () => {
      expect(isCrossed("above", 100, 101)).toBe(true);
    });

    it("fires at exactly the target", () => {
      expect(isCrossed("above", 100, 100)).toBe(true);
    });

    it("does not fire below the target", () => {
      expect(isCrossed("above", 100, 99.99)).toBe(false);
    });
  });

  describe("below", () => {
    it("fires when price drops under the target", () => {
      expect(isCrossed("below", 100, 99)).toBe(true);
    });

    it("fires at exactly the target", () => {
      expect(isCrossed("below", 100, 100)).toBe(true);
    });

    it("does not fire above the target", () => {
      expect(isCrossed("below", 100, 100.01)).toBe(false);
    });
  });
});
