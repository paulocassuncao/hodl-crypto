import {
  applyRedirectTarget,
  DEFAULT_REDIRECT,
  safeRedirect,
} from "@/lib/safe-redirect";

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
    ["C1 NEL", "/ok\u0085evil"],
    ["C1 upper bound", "/ok\u009fevil"],
    // Path normalisation smuggles an authority past a check on the INPUT:
    // `/..//evil.com` starts with `/.`, so the `//` test passes, and the
    // parsed origin is still ours — but the normalised pathname is
    // `//evil.com`, which the browser reads as a host.
    ["dot-dot collapsing into an authority", "/..//evil.com"],
    ["dot-slash collapsing into an authority", "/.//evil.com"],
    ["deep traversal into an authority", "/a/b/../../..//evil.com"],
    ["backslash traversal", "/..\\\\/evil.com"],
    ["triple slash", "/..///evil.com"],
    ["percent-encoded dot segments", "/%2e%2e//evil.com"],
  ])("refuses %s", (_name, hostile) => {
    expect(safeRedirect(hostile)).toBe(DEFAULT_REDIRECT);
  });

  it("refuses to send the user back to the login page", () => {
    // Not a security hole, a loop: they just came from there.
    expect(safeRedirect("/login")).toBe(DEFAULT_REDIRECT);
    expect(safeRedirect("/login?next=/portfolio")).toBe(DEFAULT_REDIRECT);
  });

  it("never returns anything a browser would read as another origin", () => {
    // Generated rather than listed: the fixed list was the reason the
    // `..`-normalisation bypass shipped — every entry in it failed at the
    // first guard, so none of them ever reached the output. Crossing these
    // parts builds inputs that pass the early checks and only misbehave once
    // the path has been normalised.
    const prefixes = ["/", "/.", "/..", "/a/..", "/a/b/../..", "/%2e%2e"];
    const separators = ["/", "//", "///", "/\\\\", "\\\\/"];
    const hosts = [
      "evil.com",
      "evil.com/steal",
      "user@evil.com",
      "evil.com:80",
    ];

    for (const prefix of prefixes) {
      for (const separator of separators) {
        for (const host of hosts) {
          const input = `${prefix}${separator}${host}`;
          const out = safeRedirect(input);
          expect(new URL(out, "https://hodl.test").origin).toBe(
            "https://hodl.test",
          );
        }
      }
    }
  });

  describe("applyRedirectTarget", () => {
    const applied = (target: string): string => {
      const url = new URL("https://hodl.test/login?next=whatever");
      applyRedirectTarget(url, target);
      return `${url.pathname}${url.search}${url.hash}`;
    };

    it("keeps a fragment a fragment", () => {
      // Splitting on "?" by hand baked the `#` into the path as %23, giving a
      // 404 instead of an anchor.
      expect(applied("/coins/bitcoin#chart")).toBe("/coins/bitcoin#chart");
    });

    it("keeps query and fragment apart when both are present", () => {
      expect(applied("/strategy?lens=backtest#panel")).toBe(
        "/strategy?lens=backtest#panel",
      );
    });

    it("does not drop anything after a second question mark", () => {
      expect(applied("/a?b=1?c=2")).toBe("/a?b=1?c=2");
    });

    it("clears a stale query when the target has none", () => {
      expect(applied("/portfolio")).toBe("/portfolio");
    });
  });
});
