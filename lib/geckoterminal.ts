/**
 * Server-only GeckoTerminal public API client (on-chain DEX data).
 * Keyless and free (~30 calls/min, shared), so we proxy + cache through Next
 * route handlers to respect the limit. Separate base URL from CoinGecko.
 * Never import this from client components.
 */

const BASE_URL = "https://api.geckoterminal.com/api/v2";

interface GtFetchOptions {
  /** Seconds to cache the upstream response (Next.js data cache). */
  revalidate?: number;
}

export const gtFetch = async <T>(
  path: string,
  { revalidate = 60 }: GtFetchOptions = {},
): Promise<T> => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { accept: "application/json" },
    next: { revalidate },
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error(
        "Rate limited by GeckoTerminal (429). Please wait a moment and try again.",
      );
    }
    throw new Error(`GeckoTerminal request failed (${res.status}) for ${path}`);
  }

  return res.json() as Promise<T>;
};
