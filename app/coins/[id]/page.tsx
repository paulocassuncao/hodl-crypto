import { CoinDetailView } from "@/components/coin-detail/coin-detail-view";

/** Per-coin detail route. Unwraps the async param and renders the client view. */
const CoinPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactNode> => {
  const { id } = await params;
  return <CoinDetailView id={id} />;
};

export default CoinPage;
