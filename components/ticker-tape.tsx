"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play } from "lucide-react";

import { useMarkets } from "@/hooks/use-markets";
import { useCurrency } from "@/lib/currency";
import {
  formatCurrency,
  formatPercent,
  percentColorClass,
} from "@/lib/format";
import type { Coin, Currency } from "@/lib/types";
import { useWatchlist } from "@/lib/watchlist";
import { cn } from "@/lib/utils";

const MAX_ITEMS = 18;
/** Scroll speed in pixels per second. */
const SPEED = 40;

/** Watchlist coins if any, else the biggest absolute 24h movers. */
const pickCoins = (data: Coin[], watched: Set<string>): Coin[] => {
  if (watched.size > 0) {
    const inList = data.filter((c) => watched.has(c.id));
    if (inList.length > 0) return inList;
  }
  return [...data]
    .filter((c) => c.price_change_percentage_24h_in_currency != null)
    .sort(
      (a, b) =>
        Math.abs(b.price_change_percentage_24h_in_currency ?? 0) -
        Math.abs(a.price_change_percentage_24h_in_currency ?? 0),
    )
    .slice(0, MAX_ITEMS);
};

const TickerItem = ({
  coin,
  currency,
}: {
  coin: Coin;
  currency: Currency;
}): React.ReactNode => {
  const change = coin.price_change_percentage_24h_in_currency;
  return (
    <Link
      href={`/coins/${coin.id}`}
      className="inline-flex items-center gap-1.5 hover:text-foreground"
    >
      <span className="font-medium">{coin.symbol.toUpperCase()}</span>
      <span className="tabular-nums text-muted-foreground">
        {formatCurrency(coin.current_price, currency)}
      </span>
      <span className={cn("tabular-nums", percentColorClass(change))}>
        {(change ?? 0) >= 0 ? "▲" : "▼"} {formatPercent(change)}
      </span>
    </Link>
  );
};

/**
 * Thin auto-scrolling price strip below the header. Shows the watchlist (or top
 * 24h movers as a fallback). Uses a requestAnimationFrame marquee that pauses on
 * hover; under prefers-reduced-motion it renders a static, user-scrollable strip
 * (the global reduced-motion CSS disables keyframe animations, so we JS-gate it).
 */
export const TickerTape = (): React.ReactNode => {
  const { data } = useMarkets();
  const { currency } = useCurrency();
  const { ids: watched } = useWatchlist();

  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  // The marquee halts when ANY of these is true: pointer hover, keyboard focus
  // inside the strip, a hidden tab, or the explicit pause control. Each is a ref
  // so the rAF loop reads the live value without re-subscribing every change.
  const hoverRef = useRef(false);
  const focusRef = useRef(false);
  const hiddenRef = useRef(false);
  const userPausedRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (): void => setReduced(mq.matches);
    const onVisibility = (): void => {
      hiddenRef.current = document.hidden;
    };
    // One-time client init: mark mounted, read reduced-motion + tab visibility.
    /* eslint-disable react-hooks/set-state-in-effect */
    setMounted(true);
    setReduced(mq.matches);
    /* eslint-enable react-hooks/set-state-in-effect */
    hiddenRef.current = document.hidden;
    mq.addEventListener("change", onChange);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      mq.removeEventListener("change", onChange);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Mirror the user pause toggle into a ref the rAF loop can read.
  useEffect(() => {
    userPausedRef.current = userPaused;
  }, [userPaused]);

  const coins = data ? pickCoins(data, watched) : [];

  useEffect(() => {
    if (reduced || coins.length === 0) return;
    const track = trackRef.current;
    if (!track) return;

    let offset = 0;
    let raf = 0;
    let last = performance.now();
    const step = (now: number): void => {
      const dt = (now - last) / 1000;
      last = now;
      if (
        !hoverRef.current &&
        !focusRef.current &&
        !hiddenRef.current &&
        !userPausedRef.current
      ) {
        // Wrap exactly at the first duplicated item's offset (one full copy +
        // its trailing gap) so the loop is seamless regardless of gap sizing.
        const first = track.children[coins.length] as HTMLElement | undefined;
        const wrap = first?.offsetLeft ?? track.scrollWidth / 2;
        offset -= SPEED * dt;
        if (wrap > 0 && -offset >= wrap) offset += wrap;
        track.style.transform = `translateX(${offset}px)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduced, coins.length, currency]);

  // Avoid hydration mismatch — watchlist/markets are client-only.
  if (!mounted || coins.length === 0) return null;

  if (reduced) {
    return (
      <section
        role="region"
        aria-label="Live prices"
        className="border-b bg-background/60"
      >
        <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 py-1.5 text-xs">
          {coins.map((coin) => (
            <TickerItem key={coin.id} coin={coin} currency={currency} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      role="region"
      aria-label="Live prices"
      className="relative overflow-hidden border-b bg-background/60"
      onMouseEnter={() => {
        hoverRef.current = true;
      }}
      onMouseLeave={() => {
        hoverRef.current = false;
      }}
      onFocusCapture={() => {
        focusRef.current = true;
      }}
      onBlurCapture={() => {
        focusRef.current = false;
      }}
    >
      <div
        ref={trackRef}
        className="flex w-max gap-6 py-1.5 pr-12 text-xs whitespace-nowrap will-change-transform"
      >
        {coins.map((coin) => (
          <TickerItem key={coin.id} coin={coin} currency={currency} />
        ))}
        {/* Second copy makes the loop seamless. */}
        {coins.map((coin) => (
          <TickerItem key={`${coin.id}-dup`} coin={coin} currency={currency} />
        ))}
      </div>
      {/*
        WCAG 2.2.2 (Pause, Stop, Hide): hover-pause alone strands keyboard and
        touch users, so expose a persistent, keyboard-reachable toggle. The
        short fade keeps it legible as items scroll underneath without masking
        them.
      */}
      <button
        type="button"
        onClick={() => setUserPaused((p) => !p)}
        aria-pressed={userPaused}
        aria-label={userPaused ? "Resume scrolling prices" : "Pause scrolling prices"}
        className="absolute inset-y-0 right-0 z-10 flex items-center bg-gradient-to-l from-background via-background to-transparent pr-3 pl-8 text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {userPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
      </button>
    </section>
  );
};
