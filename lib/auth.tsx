"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface AuthResult {
  /** Supabase error message, or null on success. */
  error: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  /** True until the initial session has been resolved. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Exposes the Supabase auth session to the client tree and email/password
 * actions. Mirrors the other context providers; sits at the top of the provider
 * stack so portfolio (and future) providers can react to the signed-in user.
 */
export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}): ReactNode => {
  const supabase = getSupabaseBrowserClient();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      previousUserId.current = data.session?.user.id ?? null;
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      const nextUserId = next?.user.id ?? null;
      // Sign-out (and sign-in as someone else) must not leave the previous
      // user's rows in the query cache: the client survives the client-side
      // navigation to /login, so anything keyed without a user id — the sleeve,
      // its signal events — would render for whoever signs in next. Cleared
      // here, once, instead of asking every future query to remember.
      if (
        previousUserId.current !== null &&
        previousUserId.current !== nextUserId
      ) {
        queryClient.clear();
      }
      previousUserId.current = nextUserId;
      setSession(next);
    });

    return () => subscription.unsubscribe();
  }, [supabase, queryClient]);

  const signIn = async (
    email: string,
    password: string,
  ): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message ?? null };
  };

  const signUp = async (
    email: string,
    password: string,
  ): Promise<AuthResult> => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
