import { fetchSpotBuys } from "@/lib/bybit";

const DAY = 24 * 60 * 60 * 1000;
const WINDOW = 7 * DAY;

/** Mock Bybit, recording every request and the peak number in flight. */
const mockBybit = (
  fillsFor: (symbol: string, from: number, to: number) => unknown[] = () => [],
): { calls: { symbol: string; from: number; to: number }[]; peak: () => number } => {
  const calls: { symbol: string; from: number; to: number }[] = [];
  let inFlight = 0;
  let peak = 0;

  global.fetch = jest.fn(async (url: string | URL | Request) => {
    const params = new URL(String(url)).searchParams;
    const call = {
      symbol: params.get("symbol") ?? "",
      from: Number(params.get("startTime")),
      to: Number(params.get("endTime")),
    };
    calls.push(call);

    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 1));
    inFlight -= 1;

    return {
      ok: true,
      json: async () => ({
        retCode: 0,
        retMsg: "OK",
        result: { list: fillsFor(call.symbol, call.from, call.to) },
      }),
    } as Response;
  }) as unknown as typeof fetch;

  return { calls, peak: () => peak };
};

beforeEach(() => {
  process.env.BYBIT_API_KEY = "key";
  process.env.BYBIT_API_SECRET = "secret";
});

describe("fetchSpotBuys", () => {
  it("covers every 7-day window for every tracked pair", async () => {
    const endTime = 30 * DAY;
    const startTime = 0;
    const { calls } = mockBybit();

    await fetchSpotBuys({ startTime, endTime });

    const symbols = [...new Set(calls.map((c) => c.symbol))].sort();
    expect(symbols).toEqual([
      "BTCUSDC",
      "BTCUSDT",
      "ETHUSDC",
      "ETHUSDT",
      "SOLUSDC",
      "SOLUSDT",
    ]);

    // Five windows per symbol (ceil(30d / 7d)), contiguous and clamped to end.
    const btc = calls
      .filter((c) => c.symbol === "BTCUSDT")
      .sort((a, b) => a.from - b.from);
    expect(btc).toHaveLength(5);
    expect(btc[0].from).toBe(startTime);
    expect(btc[btc.length - 1].to).toBe(endTime);
    btc.forEach((c, i) => {
      if (i > 0) expect(c.from).toBe(btc[i - 1].to);
      expect(c.to - c.from).toBeLessThanOrEqual(WINDOW);
    });
  });

  it("runs windows concurrently but stays under the rate-limit cap", async () => {
    const { calls, peak } = mockBybit();

    await fetchSpotBuys({ startTime: 0, endTime: 60 * DAY });

    // 6 symbols × 9 windows — sequentially this is the shape that timed out.
    expect(calls.length).toBe(54);
    expect(peak()).toBeGreaterThan(1);
    expect(peak()).toBeLessThanOrEqual(5);
  });

  it("returns fills sorted oldest-first across symbols", async () => {
    mockBybit((symbol, from) =>
      symbol === "BTCUSDT" || symbol === "ETHUSDT"
        ? [
            {
              symbol,
              side: "Buy",
              // ETH lands later inside each window than BTC.
              execTime: String(from + (symbol === "ETHUSDT" ? DAY : 0)),
              execQty: "1",
              execPrice: "100",
            },
          ]
        : [],
    );

    const fills = await fetchSpotBuys({ startTime: 0, endTime: 21 * DAY });

    expect(fills.length).toBe(6);
    const times = fills.map((f) => f.execTime);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("skips Sell executions", async () => {
    mockBybit((symbol, from) => [
      { symbol, side: "Sell", execTime: String(from), execQty: "1", execPrice: "1" },
    ]);

    expect(await fetchSpotBuys({ startTime: 0, endTime: 7 * DAY })).toEqual([]);
  });

  it("makes no request at all when the window is empty", async () => {
    const { calls } = mockBybit();

    expect(await fetchSpotBuys({ startTime: 5 * DAY, endTime: 5 * DAY })).toEqual(
      [],
    );
    expect(await fetchSpotBuys({ startTime: 9 * DAY, endTime: 5 * DAY })).toEqual(
      [],
    );
    expect(calls).toHaveLength(0);
  });
});
