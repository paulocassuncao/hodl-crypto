/**
 * Server-only crypto news aggregator. Fetches a handful of public RSS feeds,
 * normalizes them into a single date-sorted list, and (optionally) filters to
 * headlines mentioning a given coin. No API key or paid plan required — RSS is
 * an open standard, unlike the (now paywalled) CryptoPanic/CryptoCompare APIs.
 * Never import this from client components.
 */

import type { NewsItem } from "@/lib/types";

interface Feed {
  source: string;
  url: string;
}

/** Public RSS feeds from major crypto outlets. */
const FEEDS: Feed[] = [
  { source: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { source: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { source: "Decrypt", url: "https://decrypt.co/feed" },
  { source: "Bitcoin Magazine", url: "https://bitcoinmagazine.com/feed" },
];

/** Seconds to cache each upstream feed (Next.js data cache). */
const REVALIDATE = 600;

const decodeEntities = (text: string): string =>
  text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();

/** Pull the inner text of the first `<tag>` within a block. */
const tag = (block: string, name: string): string | null => {
  const match = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i").exec(
    block,
  );
  return match ? decodeEntities(match[1]) : null;
};

/** Parse one RSS/Atom feed body into normalized items. */
const parseFeed = (xml: string, source: string): NewsItem[] => {
  // Match both RSS <item> and Atom <entry> blocks.
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) ?? [];
  return blocks.flatMap((block): NewsItem[] => {
    const title = tag(block, "title");
    // RSS uses <link>text</link>; Atom uses <link href="..."/>.
    const link =
      tag(block, "link") ??
      /<link[^>]*href="([^"]+)"/i.exec(block)?.[1] ??
      null;
    if (!title || !link) return [];

    const dateStr =
      tag(block, "pubDate") ?? tag(block, "published") ?? tag(block, "updated");
    const parsed = dateStr ? Date.parse(dateStr) : NaN;

    return [
      {
        id: tag(block, "guid") ?? link,
        title,
        url: link,
        source,
        publishedAt: Number.isNaN(parsed) ? null : parsed,
      },
    ];
  });
};

/** Whether a headline mentions a coin by symbol (word) or name (substring). */
const mentions = (item: NewsItem, symbol: string, name: string): boolean => {
  const title = item.title.toLowerCase();
  const sym = symbol.toLowerCase();
  const symbolHit = new RegExp(`\\b${sym}\\b`).test(title);
  return symbolHit || (name.length > 2 && title.includes(name.toLowerCase()));
};

interface FetchNewsOptions {
  /** Coin symbol to filter on, e.g. "btc". */
  symbol?: string;
  /** Coin name to filter on, e.g. "Bitcoin". */
  name?: string;
}

/**
 * Aggregate, normalize, dedupe and date-sort headlines across all feeds.
 * Individual feed failures are tolerated so one outlet being down never blanks
 * the strip. When `symbol`/`name` are given, only matching headlines return.
 */
export const fetchNews = async ({
  symbol,
  name,
}: FetchNewsOptions = {}): Promise<NewsItem[]> => {
  const settled = await Promise.allSettled(
    FEEDS.map(async ({ source, url }): Promise<NewsItem[]> => {
      const res = await fetch(url, {
        headers: { "user-agent": "HODL/1.0 (+news aggregator)" },
        next: { revalidate: REVALIDATE },
      });
      if (!res.ok) throw new Error(`${source} feed failed (${res.status})`);
      return parseFeed(await res.text(), source);
    }),
  );

  const items = settled.flatMap((r) =>
    r.status === "fulfilled" ? r.value : [],
  );

  const filtered =
    symbol && name
      ? items.filter((item) => mentions(item, symbol, name))
      : items;

  // Dedupe by url, then sort newest-first (undated items sink to the bottom).
  const byUrl = new Map(filtered.map((item) => [item.url, item]));
  return [...byUrl.values()].sort(
    (a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0),
  );
};
