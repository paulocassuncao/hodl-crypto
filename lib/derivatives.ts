/**
 * Normalize CoinGecko's `/derivatives` payload into flat {@link Derivative}s.
 * CoinGecko returns hundreds of tickers with some numeric fields as strings, so
 * we coerce, then sort by open interest and cap the list. Pure (no I/O).
 */

import type { Derivative } from "@/lib/types";

export interface RawDerivative {
  market?: string;
  symbol?: string;
  price?: string | number | null;
  funding_rate?: string | number | null;
  open_interest?: string | number | null;
  volume_24h?: string | number | null;
  contract_type?: string;
}

const toNum = (value: string | number | null | undefined): number => {
  const n = typeof value === "string" ? Number(value) : (value ?? NaN);
  return Number.isFinite(n) ? n : 0;
};

const toNullableNum = (
  value: string | number | null | undefined,
): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
};

/** Top `limit` derivatives by open interest (USD), normalized. */
export const normalizeDerivatives = (
  raw: RawDerivative[],
  limit = 100,
): Derivative[] =>
  raw
    .map(
      (d): Derivative => ({
        market: d.market ?? "",
        symbol: d.symbol ?? "",
        price: toNum(d.price),
        fundingRatePct: toNullableNum(d.funding_rate),
        openInterestUsd: toNum(d.open_interest),
        volume24hUsd: toNum(d.volume_24h),
        contractType: d.contract_type ?? "",
      }),
    )
    .sort((a, b) => b.openInterestUsd - a.openInterestUsd)
    .slice(0, limit);
