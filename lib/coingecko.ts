/**
 * Server-only CoinGecko Demo API client.
 * Injects the demo key header and caches responses to respect the free
 * rate limit (~30 calls/min). Never import this from client components.
 */

import { RouteError } from "@/lib/route";

const BASE_URL = "https://api.coingecko.com/api/v3";

interface CgFetchOptions {
  /** Seconds to cache the upstream response (Next.js data cache). */
  revalidate?: number;
}

export const cgFetch = async <T>(
  path: string,
  { revalidate = 60 }: CgFetchOptions = {},
): Promise<T> => {
  const apiKey = process.env.COINGECKO_API_KEY;
  if (!apiKey) {
    throw new Error(
      "COINGECKO_API_KEY is not set. Create a free Demo key at " +
        "https://www.coingecko.com/en/developers/dashboard and add it to .env.local",
    );
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      accept: "application/json",
      "x-cg-demo-api-key": apiKey,
    },
    next: { revalidate },
  });

  if (!res.ok) {
    if (res.status === 429) {
      // Written for the user, and the one case the client should back off on —
      // so it carries its own status instead of being guessed from the text.
      throw new RouteError(
        "Rate limited by CoinGecko (429). Please wait a moment and try again.",
        429,
      );
    }
    // Internal: the path is a server detail, so this stays out of the response.
    throw new Error(`CoinGecko request failed (${res.status}) for ${path}`);
  }

  return res.json() as Promise<T>;
};
