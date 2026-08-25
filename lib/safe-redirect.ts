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

  // The OUTPUT needs its own check: every test above read the input, and the
  // input is not this string. Path normalisation collapses `..` segments, so
  // `/..//evil.com` passes the `//` test (it starts `/.`), parses same-origin
  // (it is relative), and still normalises to a pathname of `//evil.com` — an
  // authority the browser honours. This one guard is enough on its own: a
  // parsed `pathname` has had its backslashes rewritten to `/` already, and a
  // path with a single leading slash can only ever replace the path when it is
  // resolved, never the authority. So `//` is the whole attack surface here.
  if (parsed.pathname.startsWith("//")) return DEFAULT_REDIRECT;

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
};

/**
 * Point `url` at a validated target, keeping path, query and fragment apart.
 *
 * Splitting the target by hand loses data: `String.split("?")` does not stop
 * at `#`, so a fragment ends up percent-encoded inside the path
 * (`/coins/bitcoin#chart` → `/coins/bitcoin%23chart`), and a second `?` in the
 * query is dropped on the floor. Let the URL parser do it.
 */
export const applyRedirectTarget = (url: URL, target: string): void => {
  const resolved = new URL(target, "http://localhost");
  url.pathname = resolved.pathname;
  url.search = resolved.search;
  url.hash = resolved.hash;
};
