# HODL — Crypto Top 100 Dashboard

A CoinGecko/CoinMarketCap-style dashboard for the top 100 cryptocurrencies, built with Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, and TanStack React Query. Data comes from the free **CoinGecko Demo API**.

## Features

- **Global stats bar** — total market cap (+24h change), 24h volume, BTC/ETH dominance, active coins.
- **Top 100 table** — rank, coin, price, 1h / 24h / 7d change (color-coded), 24h volume, market cap, and a 7-day sparkline. Sortable columns, live search, per-row alert buttons, `j`/`k`/`Enter`/`/` keyboard navigation, and CSV export.
- **Ticker tape** — a thin auto-scrolling price strip (your watchlist, or top 24h movers), honoring reduced-motion.
- **Trending** and **Top Gainers / Losers** highlight cards.
- **Market lenses** — the top-100 list seen four ways over the same data: sortable table, relative-to-BTC screener, heatmap, and sectors.
- **Strategy** — a paper-trading sleeve running a systematic trend ensemble forward on fictitious capital, and a historical **backtest** against buy & hold and DCA.
- **Alerts** — per-coin price alerts that fire while HODL is open or installed.
- **Coin detail page** — interactive **line or candlestick (OHLC)** chart (24h / 7d / 30d / 1y), key stats, and description.
- **Compare** — up to 4 coins side by side, shareable via URL, with dynamic social-preview (OG) images.
- **Portfolio analytics** — realized vs. unrealized P&L (with %), invested vs. current value, allocation donut, best/worst performer, a **what-if** calculator, a **DCA backtest** (vs. lump sum), CSV import/export alongside JSON backup/restore, and an optional **Bybit spot sync**.
- **Installable PWA** — add to home screen, offline app shell, and price-alert notifications.
- **Currency switcher** (USD / EUR / GBP / JPY / BTC / ETH), **light/dark mode**, and **auto-refresh** every 60s.

## Getting started

### 1. Get a free CoinGecko Demo API key

Create one at <https://www.coingecko.com/en/developers/dashboard>.

### 2. Configure your environment

```bash
cp .env.example .env.local
```

Fill in the three variables under **Required to run the app** — the CoinGecko
key plus your Supabase URL and anon key. The app will not boot without the
Supabase pair.

The remaining blocks in `.env.example` are per-feature and can stay empty: the
Bybit spot sync and the trading-sleeve cron are the only things that need them,
and each fails with a clear server-side error when its variables are missing.

> Pulling from Vercel? `vercel env pull` reads the **development** target by
> default and writes a literal `[SENSITIVE]` for any variable marked Sensitive
> there — those are write-only and cannot be read back. Check the file for
> `[SENSITIVE]` before assuming a pull gave you real values.

### 3. Install and run

```bash
bun install
bun run dev
```

Open <http://localhost:3000>. Every route is gated behind auth, so the first
visit redirects to `/login` — create an account there (Supabase email/password)
before you see the market.

## How it works

All CoinGecko requests are proxied through Next.js route handlers under `app/api/*`, so the API key stays server-side. Responses are cached (`next: { revalidate }`) to stay within the Demo plan's ~30 calls/min limit; React Query layers client-side caching and auto-refresh on top.

- **Server**: `lib/coingecko.ts` (keyed fetch), `app/api/*` (proxy routes).
- **Client**: `lib/api/`, `hooks/use-*.ts` (React Query), `lib/currency.tsx` (active currency).
- **UI**: `components/` (header, stats bar, market table, highlights, coin detail).

## Scripts

> This project uses [Bun](https://bun.sh) as its package manager and script runner.
> Use `bun run test` (not `bun test`) so Jest runs instead of Bun's built-in test runner.

| Command          | Description                  |
| ---------------- | ---------------------------- |
| `bun run dev`    | Start the dev server         |
| `bun run build`  | Production build             |
| `bun run start`  | Run the production build     |
| `bun run lint`   | ESLint                       |
| `bun run format` | Prettier write               |
| `bun run test`   | Jest + React Testing Library |

## Notes / non-goals

- The whole app is gated behind email/password auth (`proxy.ts`); the portfolio lives in
  Supabase, scoped to the signed-in user. Exchange sync is Bybit spot only — no wallet sync.
- The ⌘K command palette searches **all** of CoinGecko; the top-100 table's inline filter
  narrows the loaded rows.
- News headlines are aggregated from public RSS feeds (no API key required).
