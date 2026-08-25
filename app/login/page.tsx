import { Suspense } from "react";

import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Sign in — HODL",
  description: "Sign in to track your portfolio across devices.",
};

/**
 * LoginForm reads `?next=` from the URL, so it renders under Suspense. The
 * fallback is the card's measured height, not a round number: the wrapper
 * centres its child, so a fallback taller than the form makes the card jump
 * upward the moment it resolves.
 */
const LoginPage = (): React.ReactNode => (
  <div className="flex min-h-[70vh] items-center justify-center">
    <Suspense
      fallback={<Skeleton className="h-[350px] w-full max-w-sm rounded-xl" />}
    >
      <LoginForm />
    </Suspense>
  </div>
);

export default LoginPage;
