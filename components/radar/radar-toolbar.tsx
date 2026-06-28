"use client";

import { Filter, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { conditionLabel, type FilterCondition } from "@/lib/radar";

interface RadarToolbarProps {
  q: string;
  onQChange: (q: string) => void;
  conditions: FilterCondition[];
  onOpenFilters: () => void;
  onClear: () => void;
  shownCount: number;
  totalCount: number;
}

/**
 * One slim row above the table: search and a single Filters button (with an
 * active-count badge) that opens the modal. When filters are active, a compact
 * summary line keeps the default view clean while still telling the user
 * what's applied.
 */
export const RadarToolbar = ({
  q,
  onQChange,
  conditions,
  onOpenFilters,
  onClear,
  shownCount,
  totalCount,
}: RadarToolbarProps): React.ReactNode => {
  const active = conditions.length > 0;

  return (
    <section className="space-y-2" aria-label="Radar controls">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            placeholder="Filter by name or symbol…"
            className="pl-8"
            aria-label="Filter coins by name or symbol"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={onOpenFilters}
        >
          <Filter className="size-4" />
          Filters
          {active ? (
            <Badge className="ml-0.5 h-4 min-w-4 px-1 tabular-nums">
              {conditions.length}
            </Badge>
          ) : null}
        </Button>
      </div>

      {active ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="tabular-nums">
            Showing {shownCount} of {totalCount}
          </span>
          <span aria-hidden>·</span>
          <span className="font-mono text-xs">
            {conditions.map(conditionLabel).join("  ·  ")} vs BTC
          </span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={onClear}
          >
            Clear
          </Button>
        </div>
      ) : null}
    </section>
  );
};
