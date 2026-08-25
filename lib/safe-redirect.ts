/**
 * Validation for the `?next=` the auth gate round-trips through the login page.
 *
 * A redirect target that arrives in a URL is attacker-controlled: anyone can
 * send someone a link to our own login page that bounces them to a site they
 * did not choose, wearing our domain in the address bar on the way. So the
 * rule here is allow-list, not deny-list — only a path that is unambiguously
 * same-origin and relative survives, and everything else falls back home.
 * Pure, so the hostile inputs can be enumerated in a test.
 */

/** Where an unusable or missing `next` sends the user instead. */
export const DEFAULT_REDIRECT = "/";

/**
 * The path a validated `next` should navigate to, or {@link DEFAULT_REDIRECT}.
 *
 * Rejects: absolute URLs (`https://evil.com`), protocol-relative ones
 * (`//evil.com`, which a browser treats as absolute), backslash variants that
 * some parsers normalise into `//`, anything with a control character or
 * whitespace that could split a header, and `/login` itself — sending someone
 * back to the page they just left is a loop, not a return.
 */
export const safeRedirect = (next: string | null | undefined): string => {
  if (!next) return DEFAULT_REDIRECT;

  // A leading slash is necessary but nowhere near sufficient.
  if (!next.startsWith("/")) return DEFAULT_REDIRECT;
  // `//host` and `/\host` are absolute to a browser, despite the leading slash.
  if (next.startsWith("//") || next.startsWith("/\\")) return DEFAULT_REDIRECT;
  // Whitespace and control characters are header/URL-splitting material.
  // Split in two so neither needs a control escape inside a regex: `\s`
  // covers the space/tab/newline family, the scan covers the rest of C0.
  if (/\s/.test(next)) return DEFAULT_REDIRECT;
  if (
    [...next].some((ch) => {
      const code = ch.charCodeAt(0);
      return code < 0x20 || code === 0x7f;
    })
  ) {
    return DEFAULT_REDIRECT;
  }

  // Parse against a throwaway origin so a hostile authority section shows up
  // as a different origin rather than being silently accepted.
  let parsed: URL;
  try {
    parsed = new URL(next, "http://localhost");
  } catch {
    return DEFAULT_REDIRECT;
  }
  if (parsed.origin !== "http://localhost") return DEFAULT_REDIRECT;

  // Returning to the login page is a loop, not a destination.
  if (parsed.pathname === "/login") return DEFAULT_REDIRECT;

  const target = `${parsed.pathname}${parsed.search}${parsed.hash}`;

  // The output gets its own check, because every test above looked at the
  // INPUT and they are not the same string. Path normalisation collapses `..`
  // segments, so `/..//evil.com` — which passes the `//` test, since it starts
  // `/.` — normalises to a pathname of `//evil.com`, an authority the browser
  // honours. Re-parse what we are about to hand back and require that it, too,
  // stays on the throwaway origin.
  if (target.startsWith("//") || target.startsWith("/\\")) {
    return DEFAULT_REDIRECT;
  }
  try {
    if (new URL(target, "http://localhost").origin !== "http://localhost") {
      return DEFAULT_REDIRECT;
    }
  } catch {
    return DEFAULT_REDIRECT;
  }

  return target;
};
