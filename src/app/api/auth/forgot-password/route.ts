import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`auth-reset:${ip}`, RATE_LIMITS.auth);
    if (!rl.allowed) return rl.errorResponse!;

    const { email, redirectTo } = await req.json();
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const origin = req.nextUrl.origin;
    // Default routes through /auth/callback (which exchanges the recovery code
    // for a session, then forwards to /auth/reset-password). The old default
    // "/reset-password" was both a non-existent path and skipped the exchange.
    const safeRedirect = typeof redirectTo === "string" && (redirectTo.startsWith("/") || redirectTo.startsWith(origin))
      ? redirectTo
      : `${origin}/auth/callback?type=recovery`;

    // Persist Supabase's PKCE code-verifier cookie on the response: it is
    // required later so /auth/callback can exchange the recovery code for a
    // session. Discarding it (the previous behavior) left the reset link unable
    // to establish a session, so the user could never set a new password.
    const response = NextResponse.json({ ok: true });
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, {
                ...options,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                path: "/",
              });
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: safeRedirect }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
