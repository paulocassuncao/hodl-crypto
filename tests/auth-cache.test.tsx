import { act, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { AuthProvider } from "@/lib/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

jest.mock("@/lib/supabase/client");

type AuthListener = (event: string, session: Session | null) => void;

let emit: AuthListener;
const unsubscribe = jest.fn();

const sessionFor = (userId: string | null): Session | null =>
  userId === null ? null : ({ user: { id: userId } } as Session);

/** Mount AuthProvider over a real QueryClient seeded with one user's rows. */
const mountAuth = async (
  initialUserId: string | null,
): Promise<QueryClient> => {
  (getSupabaseBrowserClient as jest.Mock).mockReturnValue({
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: sessionFor(initialUserId) } }),
      onAuthStateChange: (cb: AuthListener) => {
        emit = cb;
        return { data: { subscription: { unsubscribe } } };
      },
    },
  });

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(["sleeve", initialUserId], { states: ["private"] });

  render(
    <QueryClientProvider client={client}>
      <AuthProvider>{null}</AuthProvider>
    </QueryClientProvider>,
  );
  // Let the initial getSession() resolve so the provider knows who is signed in.
  await waitFor(() =>
    expect(client.getQueryData(["sleeve", initialUserId])).toBeDefined(),
  );
  return client;
};

describe("AuthProvider query-cache isolation", () => {
  it("drops the cache when the signed-in user signs out", async () => {
    const client = await mountAuth("user-a");
    await act(async () => {
      emit("SIGNED_OUT", null);
    });
    expect(client.getQueryData(["sleeve", "user-a"])).toBeUndefined();
  });

  it("drops the cache when a different user signs in", async () => {
    const client = await mountAuth("user-a");
    await act(async () => {
      emit("SIGNED_IN", sessionFor("user-b"));
    });
    expect(client.getQueryData(["sleeve", "user-a"])).toBeUndefined();
  });

  it("keeps the cache on a token refresh for the same user", async () => {
    const client = await mountAuth("user-a");
    await act(async () => {
      emit("TOKEN_REFRESHED", sessionFor("user-a"));
    });
    expect(client.getQueryData(["sleeve", "user-a"])).toEqual({
      states: ["private"],
    });
  });

  it("keeps public data cached when signing in from a signed-out tab", async () => {
    const client = await mountAuth(null);
    client.setQueryData(["markets"], ["public"]);
    await act(async () => {
      emit("SIGNED_IN", sessionFor("user-a"));
    });
    // Nobody was signed in, so there is nothing private to protect — refetching
    // the whole market table on every sign-in would be pure waste.
    expect(client.getQueryData(["markets"])).toEqual(["public"]);
  });
});
