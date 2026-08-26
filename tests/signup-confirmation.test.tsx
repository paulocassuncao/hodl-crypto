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
 * The provider's initial `getSession()` is resolved by hand so the setup can
 * await it inside `act()`. The previous version waited on
 * `getSupabaseBrowserClient` having been called, which the provider does
 * synchronously in its component body — satisfied before `getSession()`
 * settles, so it waited for nothing while its comment claimed otherwise.
 *
 * Worth being straight about what this does and does not buy: no assertion
 * below depends on the session resolving, because `LoginForm` renders the same
 * whether the provider is still loading or not. Blocking the release entirely
 * leaves every test green. This exists so the provider's first state update
 * lands inside `act()` instead of racing the assertions on a slower runner —
 * `act()` hygiene, not coverage. Do not read it as the latter.
 */
let releaseSession: () => void;

const supabaseMock = () => ({
  auth: {
    getSession: () =>
      new Promise<{ data: { session: Session | null } }>((resolve) => {
        releaseSession = () => resolve({ data: { session: null } });
      }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
    signUp,
    signInWithPassword,
  },
});

/** The live region is always mounted; "no notice" means it carries no text. */
const noticeText = (): string => screen.getByRole("status").textContent ?? "";

/**
 * Sign-up has three outcomes and only two of them used to be distinguishable.
 * These mount the real form over the real AuthProvider so the assertion is
 * about what a person sees, not about the shape the provider returns.
 */
const mountForm = async (): Promise<void> => {
  (getSupabaseBrowserClient as jest.Mock).mockReturnValue(supabaseMock());

  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    </QueryClientProvider>,
  );
  // Resolve the session the provider is waiting on, inside act(), so its
  // loading -> resolved transition is flushed before anything is clicked.
  await act(async () => {
    releaseSession();
  });
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

    await waitFor(() => expect(noticeText()).toMatch(/check your email/i));
    expect(noticeText()).toContain("someone@example.com");
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
    expect(noticeText()).toBe("");
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
    expect(noticeText()).toBe("");
    expect(replace).not.toHaveBeenCalled();
  });

  it("keeps naming the address the link was actually sent to", async () => {
    signUp.mockResolvedValue({
      data: { user: { id: "u1" }, session: null },
      error: null,
    });

    await mountForm();
    await submitSignUp();
    await waitFor(() => expect(noticeText()).toContain("someone@example.com"));

    // Someone re-reads the notice, thinks they mistyped, and corrects the
    // field. Nothing was sent to the new address, so the notice must not
    // start claiming otherwise.
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "typo@elsewhere.com" },
    });

    expect(noticeText()).toContain("someone@example.com");
    expect(noticeText()).not.toContain("typo@elsewhere.com");
  });

  it("clears the notice when the person switches back to sign in", async () => {
    signUp.mockResolvedValue({
      data: { user: { id: "u1" }, session: null },
      error: null,
    });

    await mountForm();
    await submitSignUp();
    await waitFor(() => expect(noticeText()).toMatch(/check your email/i));

    fireEvent.click(screen.getByRole("tab", { name: /sign in/i }));
    expect(noticeText()).toBe("");
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

    (getSupabaseBrowserClient as jest.Mock).mockReturnValue(supabaseMock());

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
      releaseSession();
    });
    await act(async () => {
      result = await probe!("someone@example.com", "short");
    });

    expect(result!.error).toBe("Password is too short");
    expect(result!.awaitingEmailConfirmation).toBe(false);
  });
});
