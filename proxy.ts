import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@supabase/ssr";

import {
  applyRedirectTarget,
  DEFAULT_REDIRECT,
  safeRedirect,
} from "@/lib/safe-redirect";
import type { Database } from "@/lib/supabase/types";

/**
 * Refreshes the Supabase auth session on every request and gates the whole app:
 * unauthenticated users are redirected to /login with a `next` param naming
 * where they were headed, which the login page returns them to on success.
 * The matcher below excludes
 * Next internals and static assets; /login itself is allowed through.
 * (Next 16 "proxy" convention, formerly "middleware".)
 */
export const proxy = async (request: NextRequest): Promise<NextResponse> => {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname === "/login";
  // The sleeve cron has no user session; the route enforces its own
  // CRON_SECRET bearer auth (see app/api/sleeve/run/route.ts).
  const isCronRoute = pathname === "/api/sleeve/run";

  if (!user && !isAuthRoute && !isCronRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Carry where they were going, so signing in returns them there instead of
    // dumping them on the home screen. The original query rides inside `next`
    // rather than staying on the login URL, where it meant nothing.
    const next = `${pathname}${request.nextUrl.search}`;
    url.search = "";
    if (next !== DEFAULT_REDIRECT) url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    // `next` is attacker-controlled — it arrived in a URL. safeRedirect only
    // lets a same-origin relative path through; applyRedirectTarget keeps its
    // path, query and fragment apart instead of splitting the string by hand.
    applyRedirectTarget(url, safeRedirect(url.searchParams.get("next")));
    return NextResponse.redirect(url);
  }

  return response;
};

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (build assets)
     * - favicon, icons, manifest, robots, sitemap, sw, and other public files
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|robots.txt|sitemap.xml|icons/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?)$).*)",
  ],
};
