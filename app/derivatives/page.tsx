import { DerivativesView } from "@/components/derivatives/derivatives-view";

export const metadata = {
  title: "Derivatives · HODL",
  description: "Top perpetual & futures markets by open interest, with funding rates.",
};

export default function DerivativesPage(): React.ReactNode {
  return <DerivativesView />;
}
