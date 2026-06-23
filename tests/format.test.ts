import {
  formatCompact,
  formatCurrency,
  formatPercent,
  percentColorClass,
} from "@/lib/format";

describe("formatPercent", () => {
  it("adds an explicit sign and two decimals", () => {
    expect(formatPercent(1.234)).toBe("+1.23%");
    expect(formatPercent(-5)).toBe("-5.00%");
  });

  it("renders a dash for missing values", () => {
    expect(formatPercent(null)).toBe("—");
    expect(formatPercent(undefined)).toBe("—");
  });
});

describe("percentColorClass", () => {
  it("maps sign to gain/loss/neutral classes", () => {
    expect(percentColorClass(1)).toBe("text-gain");
    expect(percentColorClass(0)).toBe("text-gain");
    expect(percentColorClass(-1)).toBe("text-loss");
    expect(percentColorClass(null)).toBe("text-muted-foreground");
  });
});

describe("formatCompact", () => {
  it("formats large fiat amounts compactly", () => {
    expect(formatCompact(1_240_000_000_000, "usd")).toMatch(/\$1\.24T/);
  });
});

describe("formatCurrency", () => {
  it("uses more precision for sub-dollar prices", () => {
    expect(formatCurrency(0.5, "usd")).toBe("$0.50");
    expect(formatCurrency(0.001234, "usd")).toBe("$0.001234");
    expect(formatCurrency(60000, "usd")).toBe("$60,000.00");
  });
});
