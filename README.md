# HODL — Crypto Top 100 Dashboard

A CoinGecko/CoinMarketCap-style dashboard for the top 100 cryptocurrencies, built with Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, and TanStack React Query. Data comes from the free **CoinGecko Demo API**.

## Features

- **Global stats bar** — total market cap (+24h change), 24h volume, BTC/ETH dominance, active coins.
- **Top 100 table** — rank, coin, price, 1h / 24h / 7d change (color-coded), 24h volume, market cap, and a 7-day sparkline. Sortable columns and live search.
- **Trending** and **Top Gainers / Losers** highlight cards.
- **Coin detail page** — interactive price chart (24h / 7d / 30d / 1y), key stats, and description.
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

- No portfolio, watchlist, or authentication.
- Search filters the loaded top 100 (global all-coin search is out of scope for v1).
