import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SESSION_MAX_AGE_S = 6 * 60 * 60; // 6 hours

function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/waitlist") ||
    pathname.startsWith("/api/waitlist") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/invite") ||
    pathname.startsWith("/api/enterprise-inquiry") ||
    pathname.startsWith("/api/hospital-signup") ||
    pathname.startsWith("/hospital-onboarding") ||
    pathname.startsWith("/api/hospital-onboarding") ||
    // Phone-as-dictaphone: page + APIs authenticate via signed pairing token
    pathname.startsWith("/remote-dictation") ||
    pathname.startsWith("/api/remote-dictation") ||
    pathname.startsWith("/api/transcribe/") ||
    pathname.startsWith("/hospital-signup") ||
    pathname.startsWith("/hospital-trial") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/legal") ||
    pathname.startsWith("/guide") ||
    pathname.startsWith("/hospitals") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sitemap.xml" ||
    pathname === "/icon-192" ||
    pathname === "/icon-512" ||
    pathname === "/"
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Anonymous fast-path: with no Supabase auth cookie there is no session to
  // refresh, so skip the auth network roundtrip entirely. This is the common
  // case for the public landing/pricing pages and makes them load faster.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  if (!hasAuthCookie) {
    if (isPublicPath(request.nextUrl.pathname)) {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              maxAge: SESSION_MAX_AGE_S,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
              path: "/",
            })
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = isPublicPath(request.nextUrl.pathname);

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
