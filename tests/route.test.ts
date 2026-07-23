/**
 * @jest-environment node
 */
import { handleRoute, RouteError } from "@/lib/route";

const body = async (res: Response): Promise<{ error?: string }> =>
  (await res.json()) as { error?: string };

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("handleRoute", () => {
  it("returns the value as JSON on success", async () => {
    const res = await handleRoute(async () => ({ ok: true }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("passes a RouteError's message and status through", async () => {
    const res = await handleRoute(async () => {
      throw new RouteError("Rate limited by CoinGecko (429).", 429);
    });
    expect(res.status).toBe(429);
    expect((await body(res)).error).toBe("Rate limited by CoinGecko (429).");
  });

  it("defaults a RouteError to 400", async () => {
    const res = await handleRoute(async () => {
      throw new RouteError("asset must be BTC or ETH");
    });
    expect(res.status).toBe(400);
  });

  it("never leaks an internal error message", async () => {
    const res = await handleRoute(async () => {
      throw new Error(
        'new row violates row-level security policy for table "transactions"',
      );
    });
    expect(res.status).toBe(500);
    const { error } = await body(res);
    expect(error).not.toContain("row-level security");
    expect(error).not.toContain("transactions");
  });

  it("never leaks env-var names from a missing-config error", async () => {
    const res = await handleRoute(async () => {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Copy it from …");
    });
    expect((await body(res)).error).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("logs the internal detail server-side instead of dropping it", async () => {
    const cause = new Error("connection terminated unexpectedly");
    await handleRoute(async () => {
      throw cause;
    });
    expect(console.error).toHaveBeenCalledWith(
      "[route] unhandled error:",
      cause,
    );
  });

  it("does not infer 429 from a message that merely contains '429'", async () => {
    // The old heuristic substring-matched the text: an upstream 500 for a coin
    // whose id contains 429 was served as a rate limit, telling the client to
    // back off for something that never happened.
    const res = await handleRoute(async () => {
      throw new Error("CoinGecko request failed (500) for /coins/pepe-429");
    });
    expect(res.status).toBe(500);
  });

  it("still reports a rate limit as 429 when it really is one", async () => {
    const res = await handleRoute(async () => {
      throw new RouteError("Rate limited by CoinGecko (429).", 429);
    });
    expect(res.status).toBe(429);
  });
});
