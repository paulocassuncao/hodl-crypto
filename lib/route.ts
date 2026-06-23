import { NextResponse } from "next/server";

/**
 * Wraps a route handler body, returning JSON on success and a normalized
 * `{ error }` payload (with a sensible status) on failure.
 */
export const handleRoute = async <T>(
  fn: () => Promise<T>,
): Promise<NextResponse> => {
  try {
    const data = await fn();
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    const status = message.includes("429") || message.includes("Rate limited")
      ? 429
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
};
