import { Suspense } from "react";

import { CompareView } from "@/components/compare/compare-view";

export const metadata = {
  title: "Compare · HODL",
  description: "Compare cryptocurrencies side by side with normalized charts.",
};

export default function ComparePage(): React.ReactNode {
  return (
    <Suspense fallback={null}>
      <CompareView />
    </Suspense>
  );
}
