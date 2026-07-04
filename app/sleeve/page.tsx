import type { Metadata } from "next";

import { SleeveView } from "@/components/sleeve/sleeve-view";

export const metadata: Metadata = {
  title: "Trading Sleeve — HODL",
  description:
    "Paper-trading sleeve: systematic trend strategy running forward on fictitious capital.",
};

const SleevePage = (): React.ReactNode => <SleeveView />;

export default SleevePage;
