import { Suspense } from "react";
import type { Metadata } from "next";

import { CompareView } from "@/components/compare/compare-view";

const titleCase = (id: string): string =>
  id.charAt(0).toUpperCase() + id.slice(1);

/** Reflect the selected coins (from ?ids) in the title and OG image. */
export const generateMetadata = async ({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}): Promise<Metadata> => {
  const { ids: raw } = await searchParams;
  const ids = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
  const label = ids.length > 0 ? ids.map(titleCase).join(", ") : "coins";
  const title = `Compare ${label} · HODL`;
  const description = `Side-by-side comparison of ${label} with normalized charts on HODL.`;
  return {
    title,
    description,
    openGraph: {
      title: `Compare ${label}`,
      description,
      images: [`/compare/og${ids.length > 0 ? `?ids=${ids.join(",")}` : ""}`],
    },
  };
};

export default function ComparePage(): React.ReactNode {
  return (
    <Suspense fallback={null}>
      <CompareView />
    </Suspense>
  );
}
