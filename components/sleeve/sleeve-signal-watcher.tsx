"use client";

import { useEffect } from "react";

import { toast } from "sonner";

import { useSleeveSignalEvents } from "@/hooks/use-sleeve";
import { notify } from "@/lib/notify";
import { SIGNALS_SEEN_KEY, splitFreshEvents } from "@/lib/sleeve-signals";

const STRATEGY_LABEL: Record<string, string> = {
  ema_trend: "EMA trend",
  donchian: "Donchian",
};

/**
 * Fires a toast + system notification when a sleeve strategy signal flips.
 * Mounted once, app-wide (like AlertWatcher). "New" is decided by a
 * localStorage watermark of the max event time already shown — the first
 * ever load only sets the watermark, so backfilled history never floods.
 *
 * Notifications fire while HODL is open or installed (via the service
 * worker); with no server push they can't be delivered when fully closed.
 */
export const SleeveSignalWatcher = (): null => {
  const { data } = useSleeveSignalEvents();

  useEffect(() => {
    if (!data || data.length === 0) return;
    const raw = localStorage.getItem(SIGNALS_SEEN_KEY);
    const seenMs = raw === null ? null : Number(raw);
    const { fresh, watermark } = splitFreshEvents(
      data,
      seenMs === null || Number.isNaN(seenMs) ? null : seenMs,
    );
    for (const e of fresh) {
      const flip = e.signal_after === 1 ? "entry" : "exit";
      const title = `Sleeve signal: ${e.asset} — ${STRATEGY_LABEL[e.strategy] ?? e.strategy} ${flip}`;
      toast(title, { description: e.reason });
      notify(`HODL · Sleeve ${e.asset}`, e.reason, "/sleeve");
    }
    if (watermark !== null) {
      localStorage.setItem(SIGNALS_SEEN_KEY, String(watermark));
    }
  }, [data]);

  return null;
};
