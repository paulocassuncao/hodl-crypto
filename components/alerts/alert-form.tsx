"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAlerts } from "@/lib/alerts";
import { useCurrency } from "@/lib/currency";
import type { AlertDirection } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AlertFormProps {
  coinId: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  onDone: () => void;
}

/** Form to create a price alert for a coin. */
export const AlertForm = ({
  coinId,
  symbol,
  name,
  image,
  currentPrice,
  onDone,
}: AlertFormProps): React.ReactNode => {
  const { currency } = useCurrency();
  const { add } = useAlerts();
  const [direction, setDirection] = useState<AlertDirection>("above");
  const [target, setTarget] = useState<string>(String(currentPrice));

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const value = Number(target);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a valid target price.");
      return;
    }

    add({ coinId, symbol, name, image, direction, target: value, currency });

    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      void Notification.requestPermission();
    }

    toast.success(`Alert set for ${name}`, {
      description: `Notify when price goes ${direction} ${value} ${currency.toUpperCase()}`,
    });
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        {(["above", "below"] as const).map((d) => (
          <Button
            key={d}
            type="button"
            variant={direction === d ? "default" : "outline"}
            className={cn("flex-1 capitalize")}
            onClick={() => setDirection(d)}
          >
            {d}
          </Button>
        ))}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="alert-target" className="text-sm text-muted-foreground">
          Target price ({currency.toUpperCase()})
        </label>
        <Input
          id="alert-target"
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          autoFocus
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Notify me when {symbol.toUpperCase()} goes{" "}
        <span className="font-medium text-foreground">{direction}</span> the
        target. Alerts fire only while a HODL tab is open.
      </p>

      <Button type="submit" className="w-full">
        Create alert
      </Button>
    </form>
  );
};
