/**
 * Server-only Bybit v5 REST client for the append-only spot sync.
 *
 * Signs requests with HMAC-SHA256 per Bybit v5: the payload is
 * `timestamp + apiKey + recvWindow + queryString` and the hex digest goes in
 * the `X-BAPI-SIGN` header. Keys come from `BYBIT_API_KEY`/`BYBIT_API_SECRET`
 * (read at request time, like the CoinGecko key) and must never reach the
 * client bundle — only route handlers may import this module.
 */

import type { Transaction, TxSource } from "@/lib/types";

const BYBIT_BASE = "https://api.bybit.com";
const RECV_WINDOW = "5000";
/** Bybit caps `/v5/execution/list` time ranges at 7 days per request. */
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Spot pairs the DCA buys can arrive on. */
const SYMBOLS = ["BTC", "ETH", "SOL"].flatMap((base) => [
  `${base}USDC`,
  `${base}USDT`,
]);

/** Ledger metadata per base coin, matching the existing Supabase rows. */
const COIN_META: Record<
  string,
  { coinId: string; symbol: string; name: string; image: string }
> = {
  BTC: {
    coinId: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    image: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png",
  },
  ETH: {
    coinId: "ethereum",
    symbol: "eth",
    name: "Ethereum",
    image: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
  },
  SOL: {
    coinId: "solana",
    symbol: "sol",
    name: "Solana",
    image: "https://coin-images.coingecko.com/coins/images/4128/large/solana.png",
  },
};

/** One spot Buy execution as returned by `/v5/execution/list`. */
export interface BybitFill {
  /** Base coin, e.g. "BTC". */
  coin: string;
  /** Execution time in epoch ms. */
  execTime: number;
  /** Units bought. */
  execQty: number;
  /** Price per unit in the quote currency (USDC/USDT ≈ USD). */
  execPrice: number;
}

interface BybitExecution {
  symbol: string;
  side: "Buy" | "Sell";
  execTime: string;
  execQty: string;
  execPrice: string;
}

interface BybitResponse<T> {
  retCode: number;
  retMsg: string;
  result: T;
}

interface ExecutionList {
  list: BybitExecution[];
  nextPageCursor?: string;
}

const getCredentials = (): { apiKey: string; apiSecret: string } => {
  const apiKey = process.env.BYBIT_API_KEY;
  const apiSecret = process.env.BYBIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error(
      "BYBIT_API_KEY / BYBIT_API_SECRET are not set. Create a read-only API " +
        "key at https://www.bybit.com/app/user/api-management and add both to .env.local",
    );
  }
  return { apiKey, apiSecret };
};

/**
 * Bybit v5 signature: hex HMAC-SHA256 over
 * `timestamp + apiKey + recvWindow + queryString`. Exported for unit tests.
 */
export const signBybit = async (
  apiSecret: string,
  timestamp: string,
  apiKey: string,
  recvWindow: string,
  queryString: string,
): Promise<string> => {
  const payload = `${timestamp}${apiKey}${recvWindow}${queryString}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/** Signed GET against the Bybit v5 API; throws on HTTP or `retCode` errors. */
const bybitGet = async <T>(
  path: string,
  params: Record<string, string>,
): Promise<T> => {
  const { apiKey, apiSecret } = getCredentials();
  const queryString = new URLSearchParams(params).toString();
  const timestamp = Date.now().toString();
  const sign = await signBybit(
    apiSecret,
    timestamp,
    apiKey,
    RECV_WINDOW,
    queryString,
  );
  const res = await fetch(`${BYBIT_BASE}${path}?${queryString}`, {
    headers: {
      "X-BAPI-API-KEY": apiKey,
      "X-BAPI-TIMESTAMP": timestamp,
      "X-BAPI-RECV-WINDOW": RECV_WINDOW,
      "X-BAPI-SIGN": sign,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Bybit request failed: ${res.status}`);
  const body = (await res.json()) as BybitResponse<T>;
  if (body.retCode !== 0)
    throw new Error(`Bybit error ${body.retCode}: ${body.retMsg}`);
  return body.result;
};

/** All pages of spot executions for one symbol within one ≤7-day window. */
const fetchWindow = async (
  symbol: string,
  startTime: number,
  endTime: number,
): Promise<BybitFill[]> => {
  const fills: BybitFill[] = [];
  let cursor: string | undefined;
  do {
    const params: Record<string, string> = {
      category: "spot",
      symbol,
      limit: "100",
      startTime: String(startTime),
      endTime: String(endTime),
    };
    if (cursor) params.cursor = cursor;
    const result = await bybitGet<ExecutionList>("/v5/execution/list", params);
    for (const t of result.list ?? []) {
      if (t.side !== "Buy") continue;
      fills.push({
        coin: symbol.replace(/USD[CT]$/, ""),
        execTime: Number(t.execTime),
        execQty: Number(t.execQty),
        execPrice: Number(t.execPrice),
      });
    }
    cursor = result.nextPageCursor || undefined;
  } while (cursor);
  return fills;
};

/**
 * All spot Buy executions across the tracked pairs since `startTime`,
 * paginated in 7-day windows (Bybit's per-request range cap), oldest first.
 */
export const fetchSpotBuys = async ({
  startTime,
  endTime = Date.now(),
}: {
  startTime: number;
  endTime?: number;
}): Promise<BybitFill[]> => {
  const fills: BybitFill[] = [];
  for (const symbol of SYMBOLS) {
    for (let from = startTime; from < endTime; from += WINDOW_MS) {
      const to = Math.min(from + WINDOW_MS, endTime);
      fills.push(...(await fetchWindow(symbol, from, to)));
    }
  }
  return fills.sort((a, b) => a.execTime - b.execTime);
};

/** Map a Bybit fill to a ledger {@link Transaction} tagged `source: "bybit"`. */
export const fillToTransaction = (fill: BybitFill): Transaction => {
  const meta = COIN_META[fill.coin];
  if (!meta) throw new Error(`Unknown coin from Bybit fill: ${fill.coin}`);
  return {
    id: crypto.randomUUID(),
    ...meta,
    type: "buy",
    quantity: fill.execQty,
    amount: fill.execQty * fill.execPrice,
    date: fill.execTime,
    createdAt: Date.now(),
    source: "bybit" satisfies TxSource,
  };
};
