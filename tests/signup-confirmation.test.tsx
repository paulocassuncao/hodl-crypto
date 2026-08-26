import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { LoginForm } from "@/components/auth/login-form";
import { AuthProvider, useAuth } from "@/lib/auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

jest.mock("@/lib/supabase/client");

const replace = jest.fn();
const refresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
  useSearchParams: () => new URLSearchParams(),
}));

const signUp = jest.fn();
const signInWithPassword = jest.fn();

/**
 * Sign-up has three outcomes and only two of them used to be distinguishable.
 * These mount the real form over the real AuthProvider so the assertion is
 * about what a person sees, not about the shape the provider returns.
 */
const mountForm = async (): Promise<void> => {
  (getSupabaseBrowserClient as jest.Mock).mockReturnValue({
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      signUp,
      signInWithPassword,
    },
  });

  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    </QueryClientProvider>,
  );
  // The provider resolves its initial getSession() before anything is clicked.
  await waitFor(() => expect(getSupabaseBrowserClient).toHaveBeenCalled());
};

/** Fill the form in sign-up mode and submit it. */
const submitSignUp = async (): Promise<void> => {
  fireEvent.click(screen.getByRole("tab", { name: /sign up/i }));
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: "someone@example.com" },
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: "hunter2hunter2" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
  });
};

describe("sign-up when the project requires email confirmation", () => {
  beforeEach(() => {
    replace.mockClear();
    refresh.mockClear();
    signUp.mockReset();
    signInWithPassword.mockReset();
  });

  it("says to check the email instead of navigating nowhere", async () => {
    // Supabase's answer when confirmation is on: a user, no session, no error.
    signUp.mockResolvedValue({
      data: { user: { id: "u1" }, session: null },
      error: null,
    });

    await mountForm();
    await submitSignUp();

    const notice = await screen.findByRole("status");
    expect(notice).toHaveTextContent(/check your email/i);
    expect(notice).toHaveTextContent("someone@example.com");
    // The whole point: no navigation, because nothing is signed in. Navigating
    // is what sent people back to /login in silence.
    expect(replace).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("navigates when sign-up does return a session", async () => {
    signUp.mockResolvedValue({
      data: { user: { id: "u1" }, session: { user: { id: "u1" } } as Session },
      error: null,
    });

    await mountForm();
    await submitSignUp();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the error, and no notice, when sign-up actually fails", async () => {
    signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Password is too short" },
    });

    await mountForm();
    await submitSignUp();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Password is too short",
    );
    // A failure also has no session; the notice must not fire on it too.
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("clears the notice when the person switches back to sign in", async () => {
    signUp.mockResolvedValue({
      data: { user: { id: "u1" }, session: null },
      error: null,
    });

    await mountForm();
    await submitSignUp();
    expect(await screen.findByRole("status")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /sign in/i }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

/**
 * The form checks `error` before it checks the flag, so a provider that set
 * `awaitingEmailConfirmation` on a failed sign-up would still render correctly
 * — the mutation that drops the `error === null` guard survives every test
 * above. The contract is asserted here instead, where it is observable, so the
 * guard is either covered or gone rather than quietly untested.
 */
describe("AuthProvider signUp contract", () => {
  it("never reports a pending confirmation for a failed sign-up", async () => {
    signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Password is too short" },
    });

    let result: Awaited<ReturnType<ReturnType<typeof useAuth>["signUp"]>>;
    let probe: ReturnType<typeof useAuth>["signUp"];
    const Probe = (): null => {
      probe = useAuth().signUp;
      return null;
    };

    (getSupabaseBrowserClient as jest.Mock).mockReturnValue({
      auth: {
        getSession: () => Promise.resolve({ data: { session: null } }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: jest.fn() } },
        }),
        signUp,
        signInWithPassword,
      },
    });

    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await act(async () => {
      result = await probe!("someone@example.com", "short");
    });

    expect(result!.error).toBe("Password is too short");
    expect(result!.awaitingEmailConfirmation).toBe(false);
  });
});
