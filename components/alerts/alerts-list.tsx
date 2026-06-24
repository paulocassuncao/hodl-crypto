"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUp, Bell, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAlerts } from "@/lib/alerts";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Manage all price alerts: status, delete, and clear-triggered. */
export const AlertsList = (): React.ReactNode => {
  const { alerts, remove, clearTriggered } = useAlerts();
  const hasTriggered = alerts.some((a) => a.triggeredAt !== null);

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-12 text-center">
        <Bell className="size-8 text-muted-foreground" />
        <div>
          <p className="font-medium">No price alerts yet</p>
          <p className="text-sm text-muted-foreground">
            Open any coin and tap “Set alert” to get notified on price moves.
          </p>
        </div>
        <Button
          render={<Link href="/" />}
          nativeButton={false}
          variant="outline"
          size="sm"
        >
          Browse coins
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hasTriggered ? (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={clearTriggered}>
            Clear triggered
          </Button>
        </div>
      ) : null}

      <ul className="space-y-2">
        {alerts.map((alert) => {
          const triggered = alert.triggeredAt !== null;
          return (
            <li
              key={alert.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-card p-3",
                triggered && "opacity-70",
              )}
            >
              <Link
                href={`/coins/${alert.coinId}`}
                className="flex min-w-0 items-center gap-3"
              >
                <Image
                  src={alert.image}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-full"
                  unoptimized
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{alert.name}</p>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    {alert.direction === "above" ? (
                      <ArrowUp className="size-3.5 text-gain" />
                    ) : (
                      <ArrowDown className="size-3.5 text-loss" />
                    )}
                    {alert.direction} {formatCurrency(alert.target, alert.currency)}
                  </p>
                </div>
              </Link>

              <div className="ml-auto flex items-center gap-2">
                <Badge variant={triggered ? "secondary" : "default"}>
                  {triggered ? "Triggered" : "Active"}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(alert.id)}
                  aria-label={`Delete alert for ${alert.name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
