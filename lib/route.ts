import { NextResponse } from "next/server";

/**
 * An error whose message is written FOR the user and is safe to return as-is,
 * carrying the status it should be served with.
 *
 * Everything else a route body throws — Supabase/Postgres errors, upstream
 * client failures, missing-env diagnostics — is internal: it names columns,
 * constraints, policies and env vars, and must not cross the wire.
 */
export class RouteError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RouteError";
    this.status = status;
  }
}

/** What the client sees when the failure wasn't meant for them. */
const GENERIC_MESSAGE = "Something went wrong. Please try again.";

/**
 * Wraps a route handler body, returning JSON on success and a normalized
 * `{ error }` payload on failure.
 *
 * A {@link RouteError} passes its message and status through; anything else is
 * logged server-side (so Vercel keeps the detail) and answered with a generic
 * 500. Status comes from the error's own type — never from pattern-matching
 * the message text, which used to turn any message containing "429" into a
 * rate-limit response.
 */
export const handleRoute = async <T>(
  fn: () => Promise<T>,
): Promise<NextResponse> => {
  try {
    const data = await fn();
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof RouteError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("[route] unhandled error:", error);
    return NextResponse.json({ error: GENERIC_MESSAGE }, { status: 500 });
  }
};
