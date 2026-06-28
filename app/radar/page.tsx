import { Suspense } from "react";

import { RadarView } from "@/components/radar/radar-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Radar · HODL",
  description:
    "Screen the crypto top 100 across timeframes — filter by momentum, measure performance against Bitcoin, and open any chart.",
};

/** Radar screener. RadarView reads URL state, so it renders under Suspense. */
export default function RadarPage(): React.ReactNode {
  return (
    <Suspense fallback={<Skeleton className="h-[60vh] w-full rounded-lg" />}>
      <RadarView />
    </Suspense>
  );
}
