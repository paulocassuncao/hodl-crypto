import { DexView } from "@/components/dex/dex-view";

export const metadata = {
  title: "DEX · HODL",
  description: "Trending on-chain liquidity pools across networks, via GeckoTerminal.",
};

export default function DexPage(): React.ReactNode {
  return <DexView />;
}
