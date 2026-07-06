"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { fetchPrices } from "@/lib/api";
import { isCrossed } from "@/lib/alerts-core";
import { useAlerts } from "@/lib/alerts";
import { formatCurrency } from "@/lib/format";
import { notify } from "@/lib/notify";

/**
 * Polls spot prices for active alerts and fires a toast + system notification
 * when a threshold is crossed. Mounted once, app-wide.
 *
 * Notifications fire while HODL is open or installed (via the service worker).
 * With no server, alerts can't be delivered when the app is fully closed.
 */
export const AlertWatcher = (): null => {
  const { alerts, markTriggered } = useAlerts();
  const active = alerts.filter((a) => a.triggeredAt === null);

  const ids = [...new Set(active.map((a) => a.coinId))].sort();
  const currencies = [...new Set(active.map((a) => a.currency))].sort();

  const { data } = useQuery({
    queryKey: ["alert-prices", ids.join(","), currencies.join(",")],
    queryFn: () => fetchPrices(ids, currencies.join(",")),
    enabled: ids.length > 0,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!data) return;
    for (const alert of active) {
      const price = data[alert.coinId]?.[alert.currency];
      if (price === undefined) continue;
      if (isCrossed(alert.direction, alert.target, price)) {
        markTriggered(alert.id);
        const message = `${alert.symbol.toUpperCase()} is ${alert.direction} ${formatCurrency(
          alert.target,
          alert.currency,
        )} — now ${formatCurrency(price, alert.currency)}`;
        toast(`Price alert: ${alert.name}`, { description: message });
        notify(`HODL · ${alert.name}`, message, `/coins/${alert.coinId}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return null;
};
