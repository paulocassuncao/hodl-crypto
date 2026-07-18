---
name: HODL
description: A living-space crypto dashboard — the market read as an atmospheric instrument in the dark.
colors:
  accent: "oklch(0.74 0.15 268)"
  accent-ink: "oklch(0.17 0.04 268)"
  bg: "oklch(0.15 0.022 265)"
  surface: "oklch(0.2 0.026 264)"
  surface-high: "oklch(0.26 0.03 264)"
  ink: "oklch(0.97 0.01 262)"
  muted: "oklch(0.72 0.025 262)"
  border: "oklch(1 0 0 / 0.1)"
  glass: "oklch(0.62 0.03 264 / 0.06)"
  glass-high: "oklch(0.66 0.03 264 / 0.1)"
  glass-border: "oklch(1 0 0 / 0.08)"
  glow-accent: "oklch(0.74 0.15 268 / 0.5)"
  gain: "oklch(0.8 0.15 158)"
  loss: "oklch(0.7 0.17 20)"
  warning: "oklch(0.82 0.13 82)"
  bloom-mood-up: "oklch(0.72 0.14 165 / 0.5)"
  bloom-mood-down: "oklch(0.7 0.16 25 / 0.5)"
typography:
  display:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.08em"
  numeric:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "-0.01em"
    fontFeature: "tnum lnum"
rounded:
  sm: "0.5rem"
  md: "0.625rem"
  lg: "0.75rem"
  xl: "1rem"
  pill: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.lg}"
    height: "2.25rem"
    padding: "0 0.75rem"
  card:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "1rem"
---

# Design System: HODL

## 1. Overview

**Creative North Star: "The Living Space."**

HODL reads the market as an atmosphere you look *into*, not a table you look *at*. The
whole system sits on a deep blue-black void with real depth: slow-drifting blooms of
light, a canvas starfield, a vignette pulling the eye inward. Panels are glass lifted
off that space; the numbers — the actual data — are the brightest, crispest material
on the screen, glowing faintly against the dark. It should feel like standing at an
observatory window onto the market at night: calm, dimensional, quietly alive.

This system **replaces the earlier "Trading Terminal" direction** (flat graphite + acid
lime), which read as the saturated AI-slop of every crypto dashboard. The move away from
it is deliberate: the ambient light and depth are what make HODL not-generic, and any
drift back toward a flat dark panel with a neon accent is a regression. It equally rejects
the two crypto reflexes: the **meme-coin casino** (neon gradients, glow-for-hype, FOMO)
and the **navy-and-gold fintech** template. HODL glows to convey *state*, never to excite.

**Key characteristics:**
- Deep-void, dark-native ground with a render-isolated ambient layer (blooms + starfield); light is a luminous "daytime sky" variant, not flat white.
- **Semantic ambient light** — the bloom's hue carries the market's mood (green-teal when up, ember when down). The background *reports*; it never decorates.
- One rationed luminous accent — **Periwinkle** — for interaction only, never on data.
- Green/red held in reserve for market direction: luminous, but softened, never neon.
- Glass panels + hairline rings + soft glow for depth. No flat opaque cards, no drop-shadow-as-elevation.
- Monospace tabular numerics glowing faintly against the void are the hero material.

## 2. Colors

Dark is canonical (the hero); light values follow in `app/globals.css`. Neutrals are
tinted toward the accent's blue hue (~264°) so the grays read as the system's own.

### The accent
- **Periwinkle** (`oklch(0.74 0.15 268)` dark / `oklch(0.53 0.19 268)` light): the single
  brand color. Luminous blue-violet, deliberately *cooler and bluer* than any market color
  so it never reads as "up" or "down." Used only on interactive/identity surfaces — the
  brand orb, active nav, focus rings, links, primary buttons — and **never on data**. Text
  on Periwinkle is **Accent Ink** (`oklch(0.17 0.04 268)`), a near-black, for AA contrast.

### Market semantics
- **Gain** (`oklch(0.8 0.15 158)` dark): positive movement — percentages, up-ticks, rising
  sparklines. Luminous but not the acid neon of a casino.
- **Loss** (`oklch(0.7 0.17 20)`): negative movement. Warm ember, not blood-red.

### The void & glass
- **Background / void** (`oklch(0.15 0.022 265)` dark / `oklch(0.972 0.012 265)` light): the
  deep space the whole app floats in. Never pure black; a blue-black with depth.
- **Surface / Glass** (`--glass`, `--glass-high`): panels are translucent glass over the
  void with `backdrop-blur`, bordered by a hairline **Glass Border** (`oklch(1 0 0 / 0.08)`).
  A solid `--card` exists as a fallback but the atmospheric default is glass.
- **Ink** (`oklch(0.97 0.01 262)`): body text and primary numerics. **Muted**
  (`oklch(0.72 0.025 262)`): secondary — labels, ranks, captions — holding ≥4.5:1 on the void.

### The ambient layer (`--bloom-*`, `--star-color`, `--space-*`)
Consumed only by `components/space.tsx`. The blooms default to a calm green-teal↔violet↔blue
spread; the **market-mood** hue (green-teal up / ember down) can be swapped in to make the
whole space cohere with the day's direction.

### Named rules
**The Three-Channel Rule.** Color carries exactly three meanings that never trade jobs:
**Periwinkle = "you can act on this," Gain = "market up," Loss = "market down."** Periwinkle
never colors a number; gain/loss never color a button or the ambient accent chrome.

**The Rationed-Glow Rule.** Glow means *state* or *focus*, nothing else. The accent glow
(brand orb, focus ring) and the market glow (a rising number, a gain sparkline) are the only
lit things; everything else is calm. If two glows compete, one is wrong.

**The Color-Plus-Sign Rule.** Market direction is never hue-alone. Every gain/loss value
carries an explicit sign (`+2.4%` / `−1.1%`); the ▲/▼ arrow is added where color is the only
other channel (heatmap tiles, ticker). Survives red-green CVD and grayscale.

## 3. Typography

**Display:** Bricolage Grotesque — a grotesque with genuine character (contrast, expressive
terminals) for headings, section titles, and the big hero numbers. **Body/UI:** Geist.
**Numeric/data:** Geist Mono with `font-variant-numeric: tabular-nums lining-nums`.

A true contrast pairing (characterful grotesque + neutral sans + mono), never two similar
sans. Every figure a trader compares — price, %, volume, cap, rank — is Geist Mono, tabular,
right-aligned in tables. The hero figures (total market cap, the day's move) rise to display
scale; the dense table stays on a fixed rem scale (≈1.2 ratio), never `clamp()`.

## 4. Elevation & depth

Depth is built three ways, in order of preference: (1) the **ambient space** behind
everything; (2) **glass** — translucent surfaces with `backdrop-blur` and a hairline glass
ring; (3) **tonal layering** for hovered rows and popovers. Drop shadows are reserved for
true floating overlays (dropdowns, dialogs, toasts) that float over arbitrary content —
never to separate in-flow panels. The focus ring is a Periwinkle glow (`ring` + `--glow-accent`).

**The Isolated-Space Rule.** The ambient layer (`<Space/>`) is fixed, `memo`-wrapped, and
drives its own rAF loop — it must never re-render on data updates, and `backdrop-blur` on
long live-updating lists must be applied to the container, not per-row, to stay smooth.

## 5. Components

- **Buttons:** `rounded-lg`, `2.25rem` tall. Primary = Periwinkle fill / Accent Ink text; hover brightens ~5%, active nudges down 1px. Outline/ghost use glass fills.
- **Cards / panels:** glass (`--glass`) over the void, `rounded-xl`, hairline glass ring, `backdrop-blur`. Never a flat opaque card; never a card nested in a card.
- **Nav:** frosted header (`bg-background/70 backdrop-blur-xl`) with a hairline bottom. Brand orb (a luminous body) + display wordmark; active route is a glass pill with an inset ring.
- **Inputs:** glass fill, hairline ring; focus shifts the ring to Periwinkle with a soft glow. Placeholder at ≥4.5:1, never a faint gray.
- **The market table:** the centerpiece. Crisp on a glass panel; numeric columns Geist Mono tabular right-aligned; a 7-day sparkline per row glowing by direction; rows hover to a faint accent-tinted wash with a luminous left edge. The atmosphere lives in the hero and the ground — the table itself stays scannable, glow kept subtle so it never fights the read.

## 6. Motion

Motion is part of the build, not an afterthought — but it conveys state, never decorates.
- **Ambient:** the blooms drift slowly (26–46s); the starfield drifts upward. This is the
  app "breathing." It pauses under `prefers-reduced-motion`, when the user sets
  `data-motion="off"`, and while the tab is hidden.
- **Data:** number ticks, sparkline draw-in (staggered), the hero market line drawing and its
  head gently pulsing. ~150–250ms for interaction; ease-out (quart/quint/expo), no bounce.
- **Reduced motion is not optional.** Every animation has a static fallback.

## 7. Do's and Don'ts

### Do
- Set every figure in Geist Mono tabular, right-aligned in tables.
- Reserve Periwinkle for interaction only; keep it and every glow scarce (state/focus).
- Give gain/loss a non-color signal (sign always; arrow where color is the only other cue).
- Build depth with the ambient space, glass, and tonal layering — in that order.
- Keep the ambient layer render-isolated and honor `prefers-reduced-motion` + `data-motion`.

### Don't
- **Don't** regress to a flat opaque dark panel with a neon accent — that is the rejected "Trading Terminal" / AI-slop look this system exists to escape.
- **Don't** drift toward meme-coin casino (neon gradients, hype glow) or navy-and-gold fintech.
- **Don't** color a number with Periwinkle, or a button/chrome with gain/loss.
- **Don't** use `background-clip:text` gradient text, `border-left/right` >1px color stripes, or drop-shadow to separate in-flow panels.
- **Don't** put `backdrop-blur` per-row on the live table, or let `<Space/>` re-render on data.
- **Don't** use `clamp()` fluid headings in the dense UI, or proportional digits in a data column.
