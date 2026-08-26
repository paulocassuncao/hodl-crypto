import nextConfig from "@/next.config";

/**
 * The framing refusal is one line of config with no UI to notice it missing,
 * which is exactly how it went missing until now. These assert the two headers
 * by value, so deleting or weakening either one fails here instead of failing
 * silently in a browser nobody was watching.
 */
const resolveHeaders = async () => {
  const rules = await nextConfig.headers!();
  return rules;
};

describe("security headers", () => {
  it("refuses framing on every path", async () => {
    const rules = await resolveHeaders();
    const rule = rules.find((r) => r.source === "/:path*");

    expect(rule).toBeDefined();
    expect(rule!.headers).toEqual(
      expect.arrayContaining([
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "X-Frame-Options", value: "DENY" },
      ]),
    );
  });

  it("covers the routes a person can actually land on", async () => {
    const rules = await resolveHeaders();
    const sources = rules.map((r) => r.source);

    // `/:path*` is the one pattern that matches the bare `/` as well as every
    // nested route; a rule written `/:path+` would leave the home page — the
    // most framed page there is — uncovered.
    expect(sources).toContain("/:path*");
  });
});
