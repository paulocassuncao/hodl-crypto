"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { safeRedirect } from "@/lib/safe-redirect";

type Mode = "signin" | "signup";

/**
 * Email/password auth form. The whole app is gated behind this screen by
 * `proxy.ts`, which parks the requested path in `?next=` on its way here; on
 * success we return the user there rather than to the home screen. `next`
 * arrives in a URL, so it goes through `safeRedirect` before it is followed.
 */
export const LoginForm = (): React.ReactNode => {
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // The address the confirmation was actually sent to, captured at the moment
  // it was sent. Reading the live `email` state here instead would let a later
  // edit of the field rewrite the notice into a claim about an address nothing
  // was ever sent to.
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(
    null,
  );
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setConfirmationEmail(null);
    setPending(true);
    const action = mode === "signin" ? signIn : signUp;
    const { error: authError, awaitingEmailConfirmation } = await action(
      email,
      password,
    );
    setPending(false);
    if (authError) {
      setError(authError);
      return;
    }
    // The account exists but nobody is signed in yet. Navigating here would
    // hand the person straight back to the gate, which would return them to
    // this page with no explanation — the trip that made sign-up look broken.
    if (awaitingEmailConfirmation) {
      setConfirmationEmail(email);
      setPassword("");
      return;
    }
    router.replace(safeRedirect(searchParams.get("next")));
    router.refresh();
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl">
          <span className="text-primary">HODL</span>
        </CardTitle>
        <CardDescription>
          Sign in to track your portfolio across devices
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={mode}
          onValueChange={(v) => {
            setMode(v as Mode);
            setError(null);
            setConfirmationEmail(null);
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="mt-4 space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            ) : null}

            {/*
              Mounted unconditionally, and only its text changes. A polite live
              region that is inserted into the DOM already carrying its message
              is not reliably announced — the region has to be there first for
              the change to be a change. While empty it is `sr-only`, so it sits
              out of flow and adds no gap above the button.
            */}
            <p
              role="status"
              className={cn(
                "text-sm font-medium text-gain-ink",
                confirmationEmail === null && "sr-only",
              )}
            >
              {confirmationEmail === null
                ? ""
                : `Check your email — we sent a link to ${confirmationEmail} to confirm your account. You can sign in once you have followed it.`}
            </p>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mode === "signin" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </Button>

            {/* TabsContent kept for a11y association with the active tab. */}
            <TabsContent value="signin" className="sr-only">
              Sign in to your account.
            </TabsContent>
            <TabsContent value="signup" className="sr-only">
              Create a new account.
            </TabsContent>
          </form>
        </Tabs>
      </CardContent>
    </Card>
  );
};
