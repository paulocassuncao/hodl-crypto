"use client";

import { useState } from "react";
import { Bell } from "lucide-react";

import { AlertForm } from "@/components/alerts/alert-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface AlertButtonProps {
  coinId: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  /** Render an icon-only ghost button (for dense contexts like table rows). */
  compact?: boolean;
}

/** Bell button that opens the create-alert dialog for a coin. */
export const AlertButton = ({
  compact = false,
  ...props
}: AlertButtonProps): React.ReactNode => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          compact ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Set price alert for ${props.name}`}
            />
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5" />
          )
        }
      >
        <Bell className="size-4" />
        {compact ? null : <span className="hidden sm:inline">Set alert</span>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set price alert · {props.name}</DialogTitle>
          <DialogDescription>
            Get notified when {props.symbol.toUpperCase()} crosses your target.
          </DialogDescription>
        </DialogHeader>
        <AlertForm {...props} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};
