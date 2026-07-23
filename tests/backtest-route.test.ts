/**
 * @jest-environment node
 */
import type { NextRequest } from "next/server";

import { GET } from "@/app/api/backtest/run/route";
import { fetchDailyKlines } from "@/lib/binance";

jest.mock("@/lib/binance");
const mockFetchDailyKlines = fetchDailyKlines as jest.Mock;

const call = async (query: string): Promise<Response> =>
  GET(new Request(`https://hodl.test/api/backtest/run${query}`) as NextRequest);

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
  mockFetchDailyKlines.mockResolvedValue([]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("GET /api/backtest/run parameter validation", () => {
  // `in` and bracket lookups walk the prototype chain, so these names used to
  // pass validation: `constructor` returned a full-history report under a bogus
  // period label (cached for an hour by `revalidate`), and `toString`/`valueOf`
  // reached Binance with "[object Object]" as the start time.
  it.each(["constructor", "toString", "valueOf", "hasOwnProperty", "__proto__"])(
    "rejects the Object.prototype name %s as a period",
    async (period) => {
      const res = await call(`?asset=BTC&period=${period}`);
      expect(res.status).toBe(400);
      expect(mockFetchDailyKlines).not.toHaveBeenCalled();
    },
  );

  it.each(["constructor", "toString", "valueOf"])(
    "rejects the Object.prototype name %s as an asset",
    async (asset) => {
      const res = await call(`?asset=${asset}&period=1y`);
      expect(res.status).toBe(400);
      expect(mockFetchDailyKlines).not.toHaveBeenCalled();
    },
  );

  it("rejects an unknown asset and an unknown period", async () => {
    expect((await call("?asset=DOGE&period=1y")).status).toBe(400);
    expect((await call("?asset=BTC&period=10y")).status).toBe(400);
    expect((await call("?asset=BTC")).status).toBe(400);
  });

  it("accepts the real periods and passes a numeric start time to Binance", async () => {
    for (const period of ["1y", "3y", "5y", "max"]) {
      mockFetchDailyKlines.mockClear();
      await call(`?asset=BTC&period=${period}`);
      expect(mockFetchDailyKlines).toHaveBeenCalledTimes(1);
      const [symbol, options] = mockFetchDailyKlines.mock.calls[0] as [
        string,
        { startTimeMs: number },
      ];
      expect(symbol).toBe("BTCUSDT");
      expect(typeof options.startTimeMs).toBe("number");
      expect(Number.isFinite(options.startTimeMs)).toBe(true);
    }
  });

  it("lowercases assets are accepted (the route uppercases first)", async () => {
    await call("?asset=eth&period=1y");
    expect(mockFetchDailyKlines).toHaveBeenCalledWith(
      "ETHUSDT",
      expect.anything(),
    );
  });
});
