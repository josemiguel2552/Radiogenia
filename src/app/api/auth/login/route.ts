import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`auth-login:${ip}`, RATE_LIMITS.auth);
    if (!rl.allowed) return rl.errorResponse!;

    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

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

    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (signInData.user) {
      const service = createServiceClient();
      const { data: profile } = await service
        .from("profiles")
        .select("email_verified, created_at")
        .eq("id", signInData.user.id)
        .single();

      // Deferred verification: unverified users keep full access during a
      // 7-day grace window from signup (a persistent dashboard banner asks
      // them to verify). After the window, login requires verification.
      if (profile && profile.email_verified === false) {
        const GRACE_MS = 7 * 24 * 60 * 60 * 1000;
        const age = Date.now() - Date.parse(profile.created_at || "");
        if (!(age >= 0 && age < GRACE_MS)) {
          await supabase.auth.signOut();
          return NextResponse.json({ error: "email_not_confirmed" }, { status: 403 });
        }
      }
    }

    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
