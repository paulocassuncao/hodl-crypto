"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ResponsiveContainer, Treemap } from "recharts";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMarkets } from "@/hooks/use-markets";
import { useCurrency } from "@/lib/currency";
import { formatPercent, percentArrow } from "@/lib/format";
import { heatColor } from "@/lib/heat";
import type { Coin, Currency } from "@/lib/types";

type Timeframe = "1h" | "24h" | "7d";

const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: "1h", label: "1h" },
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
];

/** Pick the percentage-change field for the selected timeframe. */
const changeFor = (coin: Coin, tf: Timeframe): number | null => {
  if (tf === "1h") return coin.price_change_percentage_1h_in_currency;
  if (tf === "7d") return coin.price_change_percentage_7d_in_currency;
  return coin.price_change_percentage_24h_in_currency;
};

interface HeatNode {
  id: string;
  name: string;
  symbol: string;
  size: number;
  pct: number | null;
  price: number;
  // Recharts' TreemapDataType requires an index signature.
  [key: string]: string | number | null;
}

interface CellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  depth?: number;
  id?: string;
  name?: string;
  symbol?: string;
  pct?: number | null;
  currency?: Currency;
  timeframe?: Timeframe;
  /** Tile ids in render order — drives roving-tabindex position. */
  idOrder?: string[];
  /** Index of the single tile that is currently in the tab order. */
  activeIndex?: number;
  onActiveChange?: (index: number) => void;
  onNavigate?: (id: string) => void;
}

/** Spoken description of a tile's movement — drives both the label and a11y name. */
const moveDescription = (pct: number | null | undefined): string => {
  if (pct == null || Number.isNaN(pct)) return "no change data";
  if (pct > 0) return `up ${formatPercent(pct)}`;
  if (pct < 0) return `down ${formatPercent(pct)}`;
  return "unchanged";
};

/**
 * Single treemap tile: colored by % change, navigates to the coin.
 * Keyboard-operable (Tab to focus, Enter/Space to open) with a Signal focus
 * ring and a spoken label carrying symbol + direction + magnitude, so the
 * heatmap is fully usable without a mouse and survives grayscale/color blindness.
 */
const HeatCell = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  depth = 0,
  id,
  name,
  symbol,
  pct,
  timeframe = "24h",
  idOrder = [],
  activeIndex = 0,
  onActiveChange,
  onNavigate,
}: CellProps): React.ReactNode => {
  // Recharts renders a root container node (depth 0) plus leaf tiles (depth 1).
  if (depth !== 1 || !id) return null;

  const showText = width > 44 && height > 26;
  const showPct = width > 56 && height > 40;
  const hasPct = pct != null && !Number.isNaN(pct);
  // Direction glyph: on the smallest tiles the % label doesn't fit, so a tile
  // would otherwise convey up/down by fill color alone. The arrow keeps the
  // signal alive for color-blind and grayscale viewers (WCAG 1.4.1).
  const arrow = percentArrow(pct);
  const label = `${name ?? symbol ?? id} (${symbol?.toUpperCase() ?? ""}), ${moveDescription(pct)} over ${timeframe}. Press Enter to view details.`;

  const navigate = (): void => onNavigate?.(id);

  // Roving tabindex: only the active tile is in the tab order, so a keyboard
  // user reaches the grid in one Tab and steps through tiles with arrow keys —
  // instead of tabbing past all 100 to leave the page.
  const myIndex = idOrder.indexOf(id);
  const lastIndex = idOrder.length - 1;
  const moveFocus = (target: number): void => {
    onActiveChange?.(target);
    document
      .querySelector<SVGGElement>(`[data-tile-index="${target}"]`)
      ?.focus();
  };

  return (
    <g
      tabIndex={myIndex === activeIndex ? 0 : -1}
      data-tile-index={myIndex}
      role="link"
      aria-label={label}
      onClick={navigate}
      onKeyDown={(e) => {
        // Activate on Enter (link convention) and Space (forgiving).
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate();
          return;
        }
        const next: Record<string, number> = {
          ArrowRight: Math.min(myIndex + 1, lastIndex),
          ArrowDown: Math.min(myIndex + 1, lastIndex),
          ArrowLeft: Math.max(myIndex - 1, 0),
          ArrowUp: Math.max(myIndex - 1, 0),
          Home: 0,
          End: lastIndex,
        };
        if (e.key in next) {
          e.preventDefault();
          moveFocus(next[e.key]);
        }
      }}
      // Inline presentation attrs (stroke) are overridden by these CSS rules on
      // focus, raising a Signal-tinted ring over the background hairline.
      className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-primary [&:focus-visible>rect]:[stroke-width:3]"
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={heatColor(pct)}
        stroke="var(--background)"
        strokeWidth={2}
        rx={4}
      />
      {/* White labels are intentional: tiles are always saturated gain/loss
          colors (a data encoding, not a themeable surface), so the label color
          is fixed white for contrast in both themes rather than a token. */}
      {showText ? (
        <text
          x={x + width / 2}
          y={y + height / 2 - (showPct ? 7 : 0)}
          textAnchor="middle"
          fill="#fff"
          fontSize={Math.min(16, Math.max(10, width / 6))}
          fontWeight={600}
          aria-hidden="true"
        >
          {symbol?.toUpperCase()}
          {!showPct && arrow ? ` ${arrow}` : ""}
        </text>
      ) : null}
      {/* Tiny tiles with no room for the symbol still get a bare arrow. */}
      {!showText && arrow && width > 16 && height > 12 ? (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="rgba(255,255,255,0.9)"
          fontSize={Math.min(12, Math.max(8, width / 3))}
          aria-hidden="true"
        >
          {arrow}
        </text>
      ) : null}
      {showPct ? (
        <text
          x={x + width / 2}
          y={y + height / 2 + 11}
          textAnchor="middle"
          fill="rgba(255,255,255,0.85)"
          fontSize={11}
          aria-hidden="true"
        >
          {/* Truthful: a coin with no change data reads as "—", never "+0.00%". */}
          {hasPct ? formatPercent(pct) : "—"}
        </text>
      ) : null}
    </g>
  );
};

/** Treemap of the top 100 coins, sized by market cap, colored by % change. */
export const MarketHeatmap = (): React.ReactNode => {
  const router = useRouter();
  const { currency } = useCurrency();
  const { data: coins, isLoading, isError, error } = useMarkets();
  const [timeframe, setTimeframe] = useState<Timeframe>("24h");

  // A market-cap treemap of all 100 coins turns the long tail into untappable,
  // unlabeled 1px slivers on a phone. On small screens we show fewer, larger
  // tiles (the big movers, which are the glanceable point) and say so honestly;
  // the full 100 always live in the sortable table. Starts at the full count so
  // server and first client render match, then narrows once we can measure.
  const [maxTiles, setMaxTiles] = useState(100);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = (): void => setMaxTiles(mq.matches ? 24 : 100);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const data = useMemo<HeatNode[]>(
    () =>
      (coins ?? [])
        .filter((c) => c.market_cap > 0)
        .sort((a, b) => b.market_cap - a.market_cap)
        .slice(0, maxTiles)
        .map((c) => ({
          id: c.id,
          name: c.name,
          symbol: c.symbol,
          size: c.market_cap,
          pct: changeFor(c, timeframe),
          price: c.current_price,
        })),
    [coins, timeframe, maxTiles],
  );

  // Roving-tabindex anchor: which tile currently holds the single tab stop.
  const idOrder = useMemo(() => data.map((d) => d.id), [data]);
  const [activeIndex, setActiveIndex] = useState(0);
  // Clamp so the tab stop stays valid if the tile set shrinks (desktop → mobile).
  const safeActiveIndex = Math.min(activeIndex, Math.max(0, idOrder.length - 1));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Market Heatmap</h1>
          <p className="text-sm text-muted-foreground">
            Top <span className="tabular-nums">{maxTiles}</span> by market cap ·
            tile size = market cap · color = {timeframe} change
          </p>
        </div>
        <Tabs
          value={timeframe}
          onValueChange={(v) => setTimeframe(v as Timeframe)}
        >
          <TabsList>
            {TIMEFRAMES.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isError ? (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load market data."}
        </div>
      ) : isLoading || data.length === 0 ? (
        <Skeleton className="h-[70vh] min-h-[26rem] w-full rounded-lg sm:h-[34rem] lg:h-[600px]" />
      ) : (
        <div
          role="group"
          aria-label={`Market heatmap, ${data.length} coins by market cap, colored by ${timeframe} change. Tab to enter, arrow keys to move between tiles, Enter to open a coin.`}
          className="h-[70vh] min-h-[26rem] w-full sm:h-[34rem] lg:h-[600px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={data}
              dataKey="size"
              isAnimationActive={false}
              content={
                <HeatCell
                  currency={currency}
                  timeframe={timeframe}
                  idOrder={idOrder}
                  activeIndex={safeActiveIndex}
                  onActiveChange={setActiveIndex}
                  onNavigate={(id) => router.push(`/coins/${id}`)}
                />
              }
            />
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};
