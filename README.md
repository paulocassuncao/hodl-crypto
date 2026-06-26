# HODL — Crypto Top 100 Dashboard

A CoinGecko/CoinMarketCap-style dashboard for the top 100 cryptocurrencies, built with Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, and TanStack React Query. Data comes from the free **CoinGecko Demo API**.

## Features

- **Global stats bar** — total market cap (+24h change), 24h volume, BTC/ETH dominance, active coins.
- **Top 100 table** — rank, coin, price, 1h / 24h / 7d change (color-coded), 24h volume, market cap, and a 7-day sparkline. Sortable columns, live search, per-row alert buttons, `j`/`k`/`Enter`/`/` keyboard navigation, and CSV export.
- **Ticker tape** — a thin auto-scrolling price strip (your watchlist, or top 24h movers), honoring reduced-motion.
- **Trending** and **Top Gainers / Losers** highlight cards.
- **On-chain DEX** — trending / new liquidity pools across networks (Ethereum, Solana, Base, BNB, Arbitrum) via the free GeckoTerminal API.
- **Derivatives** — top perpetual & futures markets by open interest, with funding rates.
- **Coin detail page** — interactive **line or candlestick (OHLC)** chart (24h / 7d / 30d / 1y), key stats, and description.
- **Compare** — up to 4 coins side by side, shareable via URL, with dynamic social-preview (OG) images.
- **Portfolio analytics** — realized vs. unrealized P&L (with %), allocation donut, best/worst performer, a **what-if** calculator, a **DCA backtest** (vs. lump sum), and CSV import/export alongside JSON backup/restore.
- **Installable PWA** — add to home screen, offline app shell, and price-alert notifications that fire while HODL is open or installed (no account required).
- **Currency switcher** (USD / EUR / GBP / JPY / BTC / ETH), **light/dark mode**, and **auto-refresh** every 60s.

## Getting started

### 1. Get a free CoinGecko Demo API key

Create one at <https://www.coingecko.com/en/developers/dashboard>.

### 2. Configure your environment

```bash
cp .env.example .env.local
# then paste your key into .env.local:
# COINGECKO_API_KEY=CG-xxxxxxxx
```

### 3. Install and run

```bash
bun install
bun run dev
```

Open <http://localhost:3000>.

## How it works

All CoinGecko requests are proxied through Next.js route handlers under `app/api/*`, so the API key stays server-side. Responses are cached (`next: { revalidate }`) to stay within the Demo plan's ~30 calls/min limit; React Query layers client-side caching and auto-refresh on top.

- **Server**: `lib/coingecko.ts` (keyed fetch), `app/api/*` (proxy routes).
- **Client**: `lib/api/`, `hooks/use-*.ts` (React Query), `lib/currency.tsx` (active currency).
- **UI**: `components/` (header, stats bar, market table, highlights, coin detail).

## Scripts

> This project uses [Bun](https://bun.sh) as its package manager and script runner.
> Use `bun run test` (not `bun test`) so Jest runs instead of Bun's built-in test runner.

| Command | Description |
| --- | --- |
| `bun run dev` | Start the dev server |
| `bun run build` | Production build |
| `bun run start` | Run the production build |
| `bun run lint` | ESLint |
| `bun run format` | Prettier write |
| `bun run test` | Jest + React Testing Library |

## Notes / non-goals

- Portfolio is local-first (manual entry, stored in your browser) and USD-denominated; no
  authentication or exchange/wallet sync.
- The ⌘K command palette searches **all** of CoinGecko; the top-100 table's inline filter
  narrows the loaded rows.
- News headlines are aggregated from public RSS feeds (no API key required).
