"use client";

import { useEffect, useState } from "react";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  conditionLabel,
  METRICS,
  METRIC_LABEL,
  OPERATORS,
  PRESETS,
  type FilterCondition,
  type RadarMetric,
  type RadarOperator,
} from "@/lib/radar";
import { cn } from "@/lib/utils";

interface RadarFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conditions: FilterCondition[];
  /** Commit a new set of conditions. */
  onApply: (conditions: FilterCondition[]) => void;
  onClear: () => void;
}

/** Native control styled to match the app's Input/Button height + ring. */
const selectClass = cn(
  "h-8 rounded-lg border border-border bg-background px-2.5 text-sm",
  "transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

/**
 * The one place Radar filtering lives — a modal (the screenshots' "Filtros"
 * popup, HODL-styled). Quick presets up top, then stackable Column/Operator/
 * Value conditions. Edits are local until Apply, so the table doesn't thrash.
 */
export const RadarFilterDialog = ({
  open,
  onOpenChange,
  conditions,
  onApply,
  onClear,
}: RadarFilterDialogProps): React.ReactNode => {
  const [draft, setDraft] = useState<FilterCondition[]>(conditions);

  const [metric, setMetric] = useState<RadarMetric>("24h");
  const [operator, setOperator] = useState<RadarOperator>("gte");
  const [value, setValue] = useState("10");

  // Re-seed the local draft from committed state each time the modal opens, so
  // a cancelled edit doesn't leak into the next open. Intentional sync set.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(conditions);
    }
  }, [open, conditions]);

  const addCondition = (): void => {
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    setDraft((d) => [...d, { metric, operator, value: num }]);
    setValue("10");
  };

  const removeCondition = (index: number): void => {
    setDraft((d) => d.filter((_, i) => i !== index));
  };

  const applyPreset = (id: string): void => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setDraft(preset.conditions);
  };

  const handleApply = (): void => {
    onApply(draft);
    onOpenChange(false);
  };

  const handleClear = (): void => {
    setDraft([]);
    onClear();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filters</DialogTitle>
          <DialogDescription>
            Surface coins by performance against Bitcoin. Multiple conditions
            all apply (AND).
          </DialogDescription>
        </DialogHeader>

        {/* Quick presets. */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Quick filters
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                size="xs"
                variant="outline"
                onClick={() => applyPreset(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Active draft conditions. */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Conditions
          </p>
          {draft.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conditions yet.</p>
          ) : (
            <ul className="space-y-1">
              {draft.map((c, i) => (
                <li
                  key={`${c.metric}-${c.operator}-${c.value}-${i}`}
                  className="flex items-center justify-between rounded-md border border-border px-2.5 py-1.5"
                >
                  <span className="font-mono text-sm tabular-nums">
                    {conditionLabel(c)}
                    <span className="ml-1 text-xs text-muted-foreground">
                      vs BTC
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${conditionLabel(c)}`}
                    onClick={() => removeCondition(i)}
                    className="inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Build a condition. */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-muted/30 p-2">
          <select
            aria-label="Filter column"
            className={selectClass}
            value={metric}
            onChange={(e) => setMetric(e.target.value as RadarMetric)}
          >
            {METRICS.map((m) => (
              <option key={m} value={m}>
                {METRIC_LABEL[m]}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter operator"
            className={selectClass}
            value={operator}
            onChange={(e) => setOperator(e.target.value as RadarOperator)}
          >
            {OPERATORS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.symbol}
              </option>
            ))}
          </select>
          <Input
            aria-label="Filter value (percent)"
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCondition()}
            className="w-20 font-mono tabular-nums"
          />
          <span className="text-sm text-muted-foreground">%</span>
          <Button type="button" size="sm" variant="outline" onClick={addCondition}>
            <Plus className="size-3.5" />
            Add
          </Button>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClear}>
            Clear
          </Button>
          <Button type="button" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
