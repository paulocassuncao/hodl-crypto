import { DEFAULT_REDIRECT, safeRedirect } from "@/lib/safe-redirect";

describe("safeRedirect", () => {
  it("keeps a same-origin path, with its query and hash", () => {
    expect(safeRedirect("/strategy?lens=backtest")).toBe(
      "/strategy?lens=backtest",
    );
    expect(safeRedirect("/portfolio")).toBe("/portfolio");
    expect(safeRedirect("/coins/bitcoin#chart")).toBe("/coins/bitcoin#chart");
  });

  it("falls back home when there is nothing to return to", () => {
    expect(safeRedirect(null)).toBe(DEFAULT_REDIRECT);
    expect(safeRedirect(undefined)).toBe(DEFAULT_REDIRECT);
    expect(safeRedirect("")).toBe(DEFAULT_REDIRECT);
  });

  // The whole reason this function exists: a link to OUR login page that
  // bounces the user somewhere else, wearing our domain on the way.
  it.each([
    ["absolute http", "http://evil.com/steal"],
    ["absolute https", "https://evil.com/steal"],
    ["protocol-relative", "//evil.com/steal"],
    ["backslash authority", "/\\evil.com/steal"],
    ["double backslash", "\\\\evil.com"],
    ["javascript scheme", "javascript:alert(1)"],
    ["data scheme", "data:text/html,<script>alert(1)</script>"],
    ["scheme with leading space", " https://evil.com"],
    ["newline split", "/ok\nLocation: https://evil.com"],
    ["tab split", "/ok\thttps://evil.com"],
    ["carriage return", "/ok\rhttps://evil.com"],
    ["no leading slash", "evil.com"],
    ["relative traversal", "../../evil"],
    ["raw control character", "/ok\u0001evil"],
    ["null byte", "/ok\u0000evil"],
    ["DEL", "/ok\u007fevil"],
    // Path normalisation smuggles an authority past a check on the INPUT:
    // `/..//evil.com` starts with `/.`, so the `//` test passes, and the
    // parsed origin is still ours — but the normalised pathname is
    // `//evil.com`, which the browser reads as a host.
    ["dot-dot collapsing into an authority", "/..//evil.com"],
    ["dot-slash collapsing into an authority", "/.//evil.com"],
    ["deep traversal into an authority", "/a/b/../../..//evil.com"],
    ["backslash traversal", "/..\\\\/evil.com"],
    ["triple slash", "/..///evil.com"],
  ])("refuses %s", (_name, hostile) => {
    expect(safeRedirect(hostile)).toBe(DEFAULT_REDIRECT);
  });

  it("refuses to send the user back to the login page", () => {
    // Not a security hole, a loop: they just came from there.
    expect(safeRedirect("/login")).toBe(DEFAULT_REDIRECT);
    expect(safeRedirect("/login?next=/portfolio")).toBe(DEFAULT_REDIRECT);
  });

  it("never returns anything a browser would read as another origin", () => {
    const hostile = [
      "http://evil.com",
      "//evil.com",
      "/\\evil.com",
      "https://evil.com/x",
      "/..//evil.com",
      "/.//evil.com",
      "/a/b/../../..//evil.com",
      "/..///evil.com",
      "/..\\\\/evil.com",
    ];
    for (const input of hostile) {
      const out = safeRedirect(input);
      expect(new URL(out, "https://hodl.test").origin).toBe(
        "https://hodl.test",
      );
    }
  });
});
