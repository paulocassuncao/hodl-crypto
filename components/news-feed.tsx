"use client";

import { Newspaper } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNews } from "@/hooks/use-news";
import { NEWS_COUNT } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/format";

interface NewsFeedProps {
  /** When set, scopes the feed to a single coin's headlines. */
  filter?: { symbol: string; name: string };
  /** Extra classes for the outer card (e.g. grid column span). */
  className?: string;
}

/** Card listing the latest aggregated crypto headlines. */
export const NewsFeed = ({
  filter,
  className,
}: NewsFeedProps): React.ReactNode => {
  const { data, isLoading } = useNews(filter);
  const items = data?.slice(0, NEWS_COUNT) ?? [];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Newspaper className="size-4 text-muted-foreground" />
          {filter ? `${filter.name} News` : "Latest News"}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-1 sm:grid-cols-2">
        {isLoading ? (
          Array.from({ length: NEWS_COUNT }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))
        ) : items.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground sm:col-span-2">
            No headlines right now.
          </p>
        ) : (
          items.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring flex items-start justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-accent"
            >
              <span className="line-clamp-2 text-sm">{item.title}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {formatRelativeTime(item.publishedAt)}
              </span>
            </a>
          ))
        )}
      </CardContent>
    </Card>
  );
};
