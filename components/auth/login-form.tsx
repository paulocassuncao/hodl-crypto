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
  const [checkEmail, setCheckEmail] = useState(false);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setCheckEmail(false);
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
      setCheckEmail(true);
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
            setCheckEmail(false);
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

            {checkEmail ? (
              <p role="status" className="text-sm font-medium text-gain-ink">
                Check your email — we sent a link to {email} to confirm your
                account. You can sign in once you have followed it.
              </p>
            ) : null}

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
