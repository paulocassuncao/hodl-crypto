import { handleRoute } from "@/lib/route";
import type { FearGreed } from "@/lib/types";

interface FngResponse {
  data: {
    value: string;
    value_classification: string;
    timestamp: string;
  }[];
}

/** GET /api/fear-greed — current crypto Fear & Greed index (alternative.me). */
export const GET = (): Promise<Response> =>
  handleRoute(async () => {
    const res = await fetch("https://api.alternative.me/fng/?limit=1", {
      headers: { accept: "application/json" },
      next: { revalidate: 1800 },
    });
    if (!res.ok) {
      throw new Error(`Fear & Greed request failed (${res.status})`);
    }
    const json = (await res.json()) as FngResponse;
    const latest = json.data[0];
    const result: FearGreed = {
      value: Number(latest.value),
      classification: latest.value_classification,
      timestamp: Number(latest.timestamp) * 1000,
    };
    return result;
  });
