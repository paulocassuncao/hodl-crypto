import { cgFetch } from "@/lib/coingecko";
import { normalizeDerivatives, type RawDerivative } from "@/lib/derivatives";
import { handleRoute } from "@/lib/route";

/** GET /api/derivatives — top derivatives tickers by open interest. */
export const GET = (): Promise<Response> =>
  handleRoute(async () => {
    const res = await cgFetch<RawDerivative[]>("/derivatives", {
      revalidate: 60,
    });
    return normalizeDerivatives(res);
  });
