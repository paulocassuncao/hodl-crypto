"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** One view a screen can be seen through. `icon` is optional — text-only
 *  switches with two or three options read better without one. */
export interface LensOption<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
}

interface LensSwitchProps<T extends string> {
  value: T;
  options: LensOption<T>[];
  onChange: (next: T) => void;
  /** Names the tablist for screen readers, e.g. "Market view". */
  ariaLabel: string;
  /** Keep labels visible below `sm`. Off by default: the Market switch has
   *  four options and only the icons fit on a phone. */
  alwaysShowLabels?: boolean;
  className?: string;
}

/**
 * The switch that changes which lens a screen is seen through — the glass pill
 * used by Market and Strategy. It exists as one component on purpose: this
 * codebase has twice drifted by re-typing a treatment instead of reusing it,
 * so a second hand-rolled tablist is the regression to avoid. Selection lives
 * in the caller (it belongs in the URL), not here.
 */
export const LensSwitch = <T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  alwaysShowLabels = false,
  className,
}: LensSwitchProps<T>): React.ReactNode => (
  <div
    role="tablist"
    aria-label={ariaLabel}
    className={cn("glass-panel inline-flex gap-1 rounded-xl p-1", className)}
  >
    {options.map(({ id, label, icon: Icon }) => {
      const active = value === id;
      return (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(id)}
          className={cn(
            "focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
            active
              ? "bg-glass-high text-foreground shadow-[inset_0_0_0_1px_var(--glass-border)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
          <span className={alwaysShowLabels ? undefined : "hidden sm:inline"}>
            {label}
          </span>
        </button>
      );
    })}
  </div>
);
