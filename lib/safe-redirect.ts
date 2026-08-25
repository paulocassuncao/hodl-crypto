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

/**
 * Destinations whose response can actually become the page the user is looking
 * at: a full navigation, and the `fetch` the App Router uses for a soft one
 * (RSC payloads travel as `empty`). Everything else — `image`, `script`,
 * `style`, `font`, … — is a subresource: the gate still intercepts it, but the
 * browser never shows the redirect, so its path is not somewhere to return to.
 */
const PAGE_BEARING_DESTINATIONS = new Set(["document", "empty"]);

/**
 * Should this request's path be remembered as somewhere to return to?
 *
 * The question is not "is this a page URL" — that was a list of route shapes
 * (`/api/*`, `opengraph-image`, …) that was never going to be complete. It is
 * "can this request's response end up in front of the user", because that is
 * when a bad return target actually hurts: an `image` request for
 * `opengraph-image` is intercepted by the gate too, but nobody ever lands on
 * the PNG, so remembering it only serves to strand them there after login.
 *
 * `empty` has to be in: a client-side navigation fetches its RSC payload that
 * way, and dropping it would lose the return-to on the most ordinary journey
 * there is — a session expiring while someone is browsing, then a link click.
 * An XHR to an API route is `empty` too and does get remembered, which is
 * harmless: that response is consumed by code, never rendered, so nobody is
 * standing on it when the redirect happens.
 *
 * A client that sends no header at all (older Safari, non-browser callers) is
 * treated as page-bearing. That keeps return-to working there, at the cost of
 * re-admitting the subresource case for those clients — a narrow reopening of
 * a bug this file already fixed, not a clean fallback.
 */
export const capturesReturnTo = (secFetchDest: string | null): boolean =>
  secFetchDest === null || PAGE_BEARING_DESTINATIONS.has(secFetchDest);

/** Where an unusable or missing `next` sends the user instead. */
export const DEFAULT_REDIRECT = "/";

/**
 * The path a validated `next` should navigate to, or {@link DEFAULT_REDIRECT}.
 *
 * Two kinds of rule live here, and a future reader should know which is which.
 *
 * **Security, do not relax:** absolute URLs (`https://evil.com`),
 * protocol-relative ones (`//evil.com`, which a browser treats as absolute),
 * backslash variants some parsers normalise into `//`, control characters or
 * whitespace that could split a header, and — the one that already bit us —
 * anything whose *normalised* path starts with `//`.
 *
 * **Product sense, safe to revisit:** `/login`, because returning someone to
 * the page they just left is a loop.
 *
 * Deliberately NOT here: a list of non-page routes (`/api/*`,
 * `opengraph-image`, …). That list is never finished — every route convention
 * Next adds would need remembering, and `opengraph-image` had already slipped
 * past an earlier version of it. The gate stops *manufacturing* those return
 * targets instead, at the source (see {@link capturesReturnTo}).
 *
 * What that leaves is a hand-written `?next=/api/markets` — and note it is not
 * only self-inflicted: someone can send that link to a signed-in victim, who
 * is redirected straight there. It is harmless because of what those routes
 * are, not because of who asked. Every handler under `app/api/*` is a
 * side-effect-free GET returning data the signed-in user could fetch anyway,
 * with two exceptions that are both already covered: `portfolio/sync-bybit`
 * is POST-only, so a navigation 405s; and `sleeve/run` does have a GET with a
 * side effect, but it demands `Authorization: Bearer $CRON_SECRET` and a
 * browser navigation cannot send that header. If any API route ever gains an
 * unauthenticated side effect on GET, this reasoning needs revisiting.
 */
export const safeRedirect = (next: string | null | undefined): string => {
  if (!next) return DEFAULT_REDIRECT;

  // A leading slash is necessary but nowhere near sufficient.
  if (!next.startsWith("/")) return DEFAULT_REDIRECT;
  // `//host` and `/\host` are absolute to a browser, despite the leading slash.
  if (next.startsWith("//") || next.startsWith("/\\")) return DEFAULT_REDIRECT;
  // Whitespace and control characters are header/URL-splitting material.
  // Split in two so neither needs a control escape inside a regex: `\s` covers
  // the space/tab/newline family, the scan covers the control ranges — C0 and
  // DEL, and C1 too, so the comment and the code agree about what "control
  // character" means here.
  if (/\s/.test(next)) return DEFAULT_REDIRECT;
  if (
    [...next].some((ch) => {
      const code = ch.charCodeAt(0);
      return code < 0x20 || (code >= 0x7f && code <= 0x9f);
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

  // Returning to the login page is a loop, not a return — and unlike the
  // non-page routes, this one the gate really can manufacture, since `/login`
  // is itself a document navigation.
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
