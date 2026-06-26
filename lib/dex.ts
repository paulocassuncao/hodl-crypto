/**
 * Normalize GeckoTerminal's JSON:API pool payloads into flat {@link Pool}s.
 * Token symbols and DEX names live in the response's `included[]` and are joined
 * back to each pool by relationship id. Pure (no I/O) so it can be unit-tested.
 */

import type { Pool } from "@/lib/types";

interface GtRef {
  data: { id: string; type: string } | null;
}

interface GtPool {
  id: string;
  attributes: {
    name: string;
    address: string;
    base_token_price_usd: string | null;
    price_change_percentage: { h24?: string | null } | null;
    volume_usd: { h24?: string | null } | null;
    reserve_in_usd: string | null;
  };
  relationships?: {
    base_token?: GtRef;
    quote_token?: GtRef;
    dex?: GtRef;
  };
}

interface GtIncluded {
  id: string;
  type: string;
  attributes: { name?: string; symbol?: string };
}

export interface GtPoolsResponse {
  data: GtPool[];
  included?: GtIncluded[];
}

const toNum = (value: string | null | undefined): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toNullableNum = (value: string | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export const normalizePools = (
  res: GtPoolsResponse,
  network: string,
): Pool[] => {
  const symbols = new Map<string, string>();
  const dexNames = new Map<string, string>();
  for (const inc of res.included ?? []) {
    if (inc.type === "token" && inc.attributes.symbol) {
      symbols.set(inc.id, inc.attributes.symbol);
    } else if (inc.type === "dex" && inc.attributes.name) {
      dexNames.set(inc.id, inc.attributes.name);
    }
  }

  return res.data.map((p) => {
    const baseId = p.relationships?.base_token?.data?.id;
    const quoteId = p.relationships?.quote_token?.data?.id;
    const dexId = p.relationships?.dex?.data?.id;
    return {
      id: p.id,
      name: p.attributes.name,
      network,
      address: p.attributes.address,
      baseSymbol:
        (baseId && symbols.get(baseId)) ||
        p.attributes.name.split("/")[0]?.trim() ||
        "",
      quoteSymbol: (quoteId && symbols.get(quoteId)) || "",
      dex: (dexId && dexNames.get(dexId)) || dexId || "",
      priceUsd: toNum(p.attributes.base_token_price_usd),
      priceChange24h: toNullableNum(p.attributes.price_change_percentage?.h24),
      volume24h: toNum(p.attributes.volume_usd?.h24),
      liquidityUsd: toNum(p.attributes.reserve_in_usd),
    } satisfies Pool;
  });
};
