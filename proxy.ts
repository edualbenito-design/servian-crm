import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLogin = path.startsWith("/login");
  // A tokenized quote link (shared with a client over WhatsApp) is public: let it
  // through so it reaches the page, which verifies the token itself.
  const isPublicQuote =
    path.startsWith("/quotes/") && request.nextUrl.searchParams.has("t");

  // Not logged in → force to login (except the login page + public quote links).
  if (!user && !isLogin && !isPublicQuote) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Already logged in but visiting login → send home.
  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on all routes except static assets AND API routes. API routes
  // (cron, iCal feed) authenticate themselves via secret/token, and must be
  // reachable without a logged-in session — otherwise this proxy would
  // redirect them to /login.
  matcher: [
    "/((?!api|manifest.webmanifest|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
