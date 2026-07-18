# Product

## Register

product

## Users

Active crypto traders and engaged holders who check the market frequently — often on mobile, often in short bursts between other things. They are data-literate, comfortable with tickers, percentages, and charts, and impatient with anything that slows down the read. Their context is a quick "what's happening right now?" check: is the market up or down, what's moving, where does my coin stand. They return many times a day, so familiarity and speed compound.

## Product Purpose

HODL is a fast, free, CoinGecko/CMC-style dashboard for the top 100 cryptocurrencies. It exists to deliver **the fastest possible read on the market**: global stats, movers, trends, and a sortable top-100 table with sparklines, plus per-coin detail, compare, heatmap, categories, alerts, and watchlist. Data is proxied from the free CoinGecko Demo API and auto-refreshes.

Success looks like: a trader opens HODL, and within a second knows the market's direction, mood, and biggest movers — without hunting, squinting, or waiting. The product wins on speed and scannability, not breadth of features or marketing polish.

## Brand Personality

Atmospheric and composed — an instrument you look *into*, not a dashboard you look *at*. Three words: **luminous, calm, alive**. The interface is a deep-void observatory window onto the market at night: dimensional, quietly breathing, with the numbers as the brightest material glowing against the dark. Confident with data, calm under volatility. Voice is terse and factual: it reports the market, it doesn't sell it. Dark-native (a luminous daytime-sky variant for light); the ambient light itself carries the market's mood. See [DESIGN.md](DESIGN.md) — "The Living Space."

## Anti-references

- **The flat dark dashboard with a neon accent** — the "Trading Terminal" direction this redesign replaced (graphite + acid lime). It reads as the saturated AI-slop of every crypto tool. A flat opaque card with a bright accent is the regression to guard against; depth and semantic ambient light are what make HODL not-generic.
- **Meme-coin casino aesthetics** — neon gradients, confetti, FOMO, "to the moon." HODL glows to convey state, never to excite. Not a slot machine.
- **Navy-and-gold fintech** and **cluttered ad-heavy data sites** — the corporate-bank template, and interstitials/ad rails/popups that bury the data.

## Design Principles

1. **Glanceability is the product.** Every screen optimizes for the sub-second read. If a layout choice slows the scan, it loses — even if it's prettier.
2. **Numbers are the interface.** Tabular/monospace numerics, consistent decimal alignment, and precise formatting matter more than chrome. The figures carry the design.
3. **Calm signal, no hype.** Report the market; don't sell it. Color and motion are used to convey state (up/down/mood), never to excite or distract.
4. **Instrument-grade trust.** Accuracy and honesty build the credibility a money tool needs: show data freshness, loading, and error/empty states truthfully rather than faking completeness.
5. **Earn density.** Show a lot without clutter. Every pixel of data must justify its space; decorative chrome must not.

## Accessibility & Inclusion

Target **WCAG 2.2 AA**. Critically, because gains/losses are core and encoded in red/green, **state must never be conveyed by color alone** — pair color with sign, arrows (▲/▼), or labels so colorblind users (and grayscale renders) read the same signal. Maintain AA contrast for all body text and numerics (the dense data is the content; it cannot be low-contrast "for elegance"). Full keyboard support and visible focus for the command-palette search, sortable tables, and switchers. Honor `prefers-reduced-motion` for sparklines, chart transitions, and any auto-refresh affordances.
