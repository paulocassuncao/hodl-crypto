import { cgFetch } from "@/lib/coingecko";
import { handleRoute } from "@/lib/route";
import type { Currency } from "@/lib/types";

/** Currencies we publish conversion rates for (mirrors CURRENCIES). */
const VS_CURRENCIES = "usd,eur,gbp,jpy,btc,eth";

/**
 * GET /api/fx
 * USD→currency conversion multipliers, derived from bitcoin's price quoted in
 * each currency (rate = btc_in_currency / btc_in_usd). Lets the client render
 * USD-denominated figures (portfolio, DEX, derivatives) in the active currency
 * without re-fetching every dataset per currency.
 */
export const GET = (): Promise<Response> =>
  handleRoute(async () => {
    const data = await cgFetch<Record<string, Record<string, number>>>(
      `/simple/price?ids=bitcoin&vs_currencies=${VS_CURRENCIES}`,
      { revalidate: 300 },
    );

    const btc = data.bitcoin ?? {};
    const usd = btc.usd || 1;
    const rates = {} as Record<Currency, number>;
    for (const [code, price] of Object.entries(btc)) {
      rates[code as Currency] = price / usd;
    }
    return rates;
  });
