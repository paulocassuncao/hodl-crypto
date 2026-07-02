---
name: HODL
description: A trading-terminal dashboard for the fastest read on the crypto top 100.
colors:
  signal: "oklch(0.84 0.19 120)"
  signal-ink: "oklch(0.18 0.02 140)"
  bg: "oklch(0.17 0.008 140)"
  surface: "oklch(0.21 0.009 140)"
  surface-high: "oklch(0.25 0.010 140)"
  ink: "oklch(0.96 0.006 140)"
  muted: "oklch(0.70 0.010 140)"
  border: "oklch(0.31 0.008 140)"
  gain: "oklch(0.76 0.16 152)"
  loss: "oklch(0.66 0.21 25)"
  warning: "oklch(0.80 0.13 80)"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.04em"
  numeric:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
    fontFeature: "tnum"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  pill: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.signal-ink}"
    rounded: "{rounded.lg}"
    height: "2rem"
    padding: "0 0.625rem"
  button-outline:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "2rem"
    padding: "0 0.625rem"
  button-ghost:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.muted}"
    rounded: "{rounded.lg}"
    height: "2rem"
    padding: "0 0.625rem"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "2rem"
    padding: "0.25rem 0.625rem"
  badge-default:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.signal-ink}"
    rounded: "{rounded.pill}"
    height: "1.25rem"
    padding: "0.125rem 0.5rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "1rem"
---

# Design System: HODL

## 1. Overview

**Creative North Star: "The Trading Terminal"**

HODL is a precision instrument, not a website. The whole system is built around a single job: a trader glances at the screen and, in under a second, reads the state of the market. Everything that does not serve that read is removed. Surfaces are flat graphite glass; dividers are hairlines, not boxes; the numbers themselves — in a tabular monospace — are the brightest, most deliberate material on the screen. Color is rationed and semantic: green means up, red means down, and one acid-lime "Signal" marks the thing you can act on. Nothing decorates.

This system explicitly rejects the stock-shadcn neutral starter it grew out of — the chroma-zero gray palette that reads as "AI made that" rather than as a tool a trader trusts. It equally rejects the two reflexes a crypto dashboard falls into: the **meme-coin casino** (neon gradients, glow, FOMO energy) and the **navy-and-gold fintech** template. HODL is dark-native and composed: an after-hours trading desk, graphite and quiet, with figures ticking in cool light and a single lime readout marking the live edge.

The interface is dense by intent. A trader wants the whole top 100, the global stats, the movers, and the mood on one calm surface — density is a feature here, clutter is the enemy. Familiarity is also a feature: this should feel instantly legible to anyone fluent in TradingView, Bloomberg, or CoinGecko, then quietly better.

**Key Characteristics:**
- Dark-native graphite surface; light theme is a clean daylight equivalent, never an afterthought.
- Monospace tabular numerics treated as the hero material — figures align to the decimal, everywhere.
- One rationed brand color ("Signal" lime) for interaction only; green/red reserved for market direction.
- Flat by default: hairline rings and tonal layering convey depth, never drop shadows.
- Sub-second glanceability is the acceptance test for every layout decision.

## 2. Colors

A composed, dark-native graphite palette carrying exactly one brand accent, with green/red held in strict reserve for market semantics. The neutrals are tinted a near-imperceptible amount toward the brand's own green hue (≈140°) so the grays read as the system's own, not as default gray.

The values below are **dark-native (canonical)**; the light theme equivalents follow each role for the daylight variant.

### Primary
- **Signal Lime** (`oklch(0.84 0.19 120)` dark / `oklch(0.80 0.18 120)` light): The single brand color. Acid yellow-green, pushed deliberately *yellower* than the gain-green so it never reads as "up." Used exclusively on interactive and identity surfaces — primary buttons, the active tab/selection, focus rings, links, the wordmark — and **never** on data. On Signal, text is **Signal Ink** (`oklch(0.18 0.02 140)`), a near-black, for AA contrast on the bright lime.

### Secondary
- **Gain Green** (`oklch(0.76 0.16 152)` dark / `oklch(0.5 0.14 152)` light): Positive price movement only — percentages, up-arrows, rising sparklines, heatmap tiles. Cleaner and greener than Signal Lime. The light value is deepened to a forest green so the small percentage text clears AA (≥4.5:1) on white.
- **Loss Red** (`oklch(0.66 0.21 25)` dark / `oklch(0.56 0.20 25)` light): Negative price movement only — percentages, down-arrows, falling sparklines, heatmap tiles.

### Tertiary
- **Caution Amber** (`oklch(0.80 0.13 80)` dark / `oklch(0.70 0.13 80)` light): Sparingly, for stale-data and rate-limit warnings (the CoinGecko Demo plan throttles). Not a brand color; a status color.

### Neutral
- **Graphite BG** (`oklch(0.17 0.008 140)` dark / `oklch(1 0 0)` light): The app background. Deep cool graphite in dark; pure white in daylight.
- **Surface** (`oklch(0.21 0.009 140)` dark / `oklch(0.985 0.003 140)` light): Cards, panels, the table container, sticky header. One step off the background.
- **Surface High** (`oklch(0.25 0.010 140)` dark / `oklch(0.96 0.004 140)` light): Hover/selected rows, dropdowns, popovers — the next tonal layer up.
- **Ink** (`oklch(0.96 0.006 140)` dark / `oklch(0.18 0.01 140)` light): Body text and primary numerics. Carries a trace of the brand hue.
- **Muted** (`oklch(0.70 0.010 140)` dark / `oklch(0.50 0.015 140)` light): Secondary text — symbols, ranks, column labels, captions. Holds ≥4.5:1 on its surface; not a decorative light-gray.
- **Border** (`oklch(0.31 0.008 140)` dark / `oklch(0.90 0.005 140)` light): Hairline dividers, table row rules, ring borders. 1px, never a heavier accent.

### Named Rules
**The Three-Channel Rule.** Color carries exactly three meanings and they never trade jobs: **Signal Lime = "you can act on this"**, **Green = "market up"**, **Red = "market down."** Signal never colors a number; green/red never color a button. A reader must be able to learn the screen's color language in one glance and trust it everywhere.

**The Rationed Accent Rule.** Signal Lime appears on ≤10% of any screen. Its scarcity is what makes the live, actionable element findable in a dense grid of figures. If two limes compete for attention, one is wrong.

**The Color-Plus-Sign Rule.** Market direction is *never* conveyed by hue alone. Every gain/loss value carries a **non-color signal** so it survives red-green color blindness and grayscale rendering. The baseline, required everywhere a percentage is rendered, is the **explicit sign** (`+2.4%` / `−1.1%`) — this is what the dense market table and stats use, where a leading arrow would only duplicate the sign and tax density. The **arrow** (▲/▼) is added in the contexts where color is the *only* other channel or where a single glance must read direction at a distance: the **heatmap tiles** (no sign shown — the arrow is the sole non-color cue) and the **ticker tape**. Arrow logic lives in one place (`percentArrow` in `lib/format.ts`); a flat 0% gets no arrow, since it has no direction.

## 3. Typography

**Display / UI Font:** Geist (with `system-ui, sans-serif`)
**Numeric / Data Font:** Geist Mono (with `ui-monospace, monospace`)

**Character:** One contemporary grotesk family does all the interface work — headings, labels, body — kept in a tight scale so nothing shouts. Its monospace sibling is promoted to a first-class role: **every figure on the screen is set in Geist Mono with tabular figures**, so prices, percentages, market caps, and ranks align to the decimal column for instant vertical scanning. The pairing is a true contrast pair (proportional grotesk + monospace), not two similar sans-serifs.

### Hierarchy
- **Display** (600, 1.5rem / 24px, 1.2, −0.01em): Page-level headings ("Top 100 by Market Cap"). Fixed rem, never fluid — this is product UI, not a hero.
- **Title** (600, 1.125rem / 18px, 1.3): Section and card titles ("Trending", "Fear & Greed").
- **Body** (400, 0.875rem / 14px, 1.5): Descriptions and prose. Cap prose at 65–75ch; tabular data may run denser.
- **Label** (500, 0.75rem / 12px, +0.04em, uppercase): Column headers and metadata captions. The one place tracked uppercase is allowed — it earns it as a data-table convention.
- **Numeric** (Geist Mono, 500, 0.875rem / 14px, `font-variant-numeric: tabular-nums`): All prices, percentages, volumes, caps, ranks, and chart axes.

### Named Rules
**The Numbers-Are-Monospace Rule.** If it's a figure a trader compares — price, %, volume, cap, rank — it is Geist Mono with tabular figures, right-aligned in tables, decimal-aligned in columns. Proportional digits in a data column are a bug.

**The Fixed-Scale Rule.** Type sizes are a fixed rem scale (ratio ≈1.2), never `clamp()`. A heading that shrinks inside a sidebar or card looks broken, not responsive.

## 4. Elevation

This system is **flat by default and does not use drop shadows**. Depth is built two ways: a **1px hairline ring** (`ring-1`, border color at ~10% ink) that draws cards, the table, and panels as crisp planes, and **tonal layering** — Background → Surface → Surface High — that lifts hovered rows, dropdowns, and popovers by stepping lightness, not by casting a shadow. The sticky header is the one permitted exception: a `backdrop-blur` over a translucent surface, used functionally to keep column context legible while scrolling, not decoratively.

### Named Rules
**The Ring-Not-Shadow Rule.** *In-flow* containers — cards, the table, panels, the stats strip — are separated by hairline rings and tonal steps, never by `box-shadow`. A drop shadow on a card here is the 2014-app tell. If a surface needs to feel lifted, raise its tone one step (Surface → Surface High); don't float it. **The one exception is true floating overlays** (dropdowns, popovers, tooltips, dialogs, toasts): because they float over arbitrary content, they pair the hairline ring with a single soft shadow for separation. Everything anchored in the page layout stays flat.

**The Glow-Is-Focus Rule.** The only "shadow-like" effect permitted is the focus ring — a 3px Signal-tinted ring (`ring-3 ring-signal/50`) on keyboard focus. Glow means "focused," nothing else.

## 5. Components

### Buttons
- **Shape:** Gently rounded (`0.625rem` / `rounded-lg`); compact `2rem` (h-8) default height, `0 0.625rem` padding, `0.875rem` medium-weight label.
- **Primary:** Signal Lime background, Signal Ink text. The single highest-emphasis action on a view. Hover dims to ~80% opacity; `:active` nudges down 1px (`translate-y-px`).
- **Outline:** Background surface, 1px border, ink text. The default for toolbar actions (sort, currency). Hover fills to Surface High.
- **Ghost:** No border, muted text; hover fills to Surface High and lifts text to ink. For low-emphasis and icon buttons.
- **Destructive:** Tinted, not solid — Loss Red at ~10% background with Loss Red text. Never a fully saturated red fill.
- **Focus / Hover:** 150–200ms `transition-all`; focus shows the 3px Signal ring. No choreography.

### Chips / Badges
- **Style:** Pill (`rounded-pill`), `1.25rem` tall, `0.75rem` text. Default = Signal Lime fill / Signal Ink text for counts and "live" markers; outline and ghost variants for quiet metadata (categories, symbols).
- **State:** Selected chips use Signal fill; unselected use outline. Never use green/red as a chip brand color — those are reserved for direction.

### Cards / Containers
- **Corner Style:** `0.875rem` (`rounded-xl`).
- **Background:** Surface, on the Graphite BG.
- **Elevation Strategy:** Flat — `ring-1` hairline ring, no shadow (see §4).
- **Internal Padding:** `1rem` (`--card-spacing`), `0.75rem` in compact (`size="sm"`) cards. Footers step to Surface High with a top hairline.
- **Rule:** Cards are for genuinely grouped, self-contained widgets (Fear & Greed, Trending, Gainers/Losers) — never as a wrapper around the primary data table. Never nest a card in a card.

### Inputs / Fields
- **Style:** `2rem` tall, `rounded-lg`, 1px border, transparent background. The filter field leads with a muted search glyph.
- **Focus:** Border shifts to Signal and a 3px `ring-signal/50` appears. No layout shift.
- **Placeholder:** Muted, but at the same ≥4.5:1 contrast as body — never a faint gray.
- **Error / Disabled:** `aria-invalid` borders + rings in Loss Red at low opacity; disabled drops to 50% and blocks pointer events.

### Navigation
- **Style:** Sticky top bar, translucent Surface with `backdrop-blur`, hairline bottom border. Bold "HODL" wordmark, then text links in muted that lift to ink on hover; the active route reads in ink. Right cluster: command-palette search trigger, currency switcher, theme toggle. Collapses to a slide-out sheet on mobile.

### Signature Component — The Market Table
The product's centerpiece and its strongest existing asset. A **responsive dual-mode** list: a stacked, tappable card list below `md` (no horizontal scroll on phones) and a full sortable data table at `md+`. Every numeric column is Geist Mono tabular and right-aligned; gain/loss cells pair color with sign; a 7-day **Sparkline** rides each row, its stroke colored by net direction. Column headers are uppercase Label type with a sort-state arrow (▲/▼) and a dimmed idle indicator. Rows hover to Surface High; the whole mobile card is a single tap target. Loading shows **skeleton rows**, not spinners; empty states teach ("No coins in your watchlist yet — tap ☆ to add.").

## 6. Do's and Don'ts

### Do:
- **Do** set every figure (price, %, volume, market cap, rank) in **Geist Mono with `tabular-nums`**, right-aligned in tables and decimal-aligned in columns.
- **Do** reserve color to three meanings — Signal Lime = actionable, Green = up, Red = down — and keep Signal Lime to ≤10% of any screen.
- **Do** give every gain/loss a non-color signal: the explicit sign (`+2.4%` / `−1.1%`) everywhere as the baseline, plus the ▲/▼ arrow in sign-less or glance-first contexts (heatmap tiles, ticker) — via the shared `percentArrow` helper.
- **Do** convey depth with hairline rings and tonal layering (Background → Surface → Surface High).
- **Do** use skeleton loaders for data, and empty states that teach the interface.
- **Do** keep type on a fixed rem scale (≈1.2 ratio); reserve uppercase tracked Labels for column headers only.

### Don't:
- **Don't** ship the **stock-shadcn chroma-zero neutral palette** — the un-branded gray that reads as "AI made that" is the #1 anti-reference. Tint neutrals toward the brand's own hue.
- **Don't** drift toward the **meme-coin casino** (neon gradients, decorative glow, FOMO energy) or the **navy-and-gold fintech** template. HODL is composed graphite, not a slot machine or a bank brochure.
- **Don't** color a number with Signal Lime or color a button with Green/Red. The three channels never trade jobs.
- **Don't** use `box-shadow` to separate containers, or `border-left`/`border-right` >1px as a colored stripe accent. Hairline rings and tonal steps only.
- **Don't** use `background-clip: text` gradient text, glassmorphism as decoration, or display fonts in labels/buttons/data.
- **Don't** use `clamp()` fluid headings in the app UI, or proportional (non-tabular) digits in a data column.
- **Don't** wrap the primary data table in a card, and never nest a card inside a card.
