"use client";

import { Star } from "lucide-react";

import { useWatchlist } from "@/lib/watchlist";
import { cn } from "@/lib/utils";

/** Toggle button to add/remove a coin from the watchlist. */
export const WatchlistStar = ({
  id,
  className,
}: {
  id: string;
  className?: string;
}): React.ReactNode => {
  const { isWatched, toggle } = useWatchlist();
  const watched = isWatched(id);

  return (
    <button
      type="button"
      aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
      aria-pressed={watched}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:text-star pointer-coarse:size-11 pointer-coarse:p-0",
        watched && "text-star",
        className,
      )}
    >
      <Star className={cn("size-4", watched && "fill-star")} />
    </button>
  );
};
