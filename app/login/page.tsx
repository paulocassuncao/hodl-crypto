import { Suspense } from "react";

import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Sign in — HODL",
  description: "Sign in to track your portfolio across devices.",
};

/** LoginForm reads `?next=` from the URL, so it renders under Suspense. */
const LoginPage = (): React.ReactNode => (
  <div className="flex min-h-[70vh] items-center justify-center">
    <Suspense
      fallback={<Skeleton className="h-96 w-full max-w-sm rounded-xl" />}
    >
      <LoginForm />
    </Suspense>
  </div>
);

export default LoginPage;
