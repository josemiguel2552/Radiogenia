import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const error = searchParams.get("error");
  if (error) {
    const desc = searchParams.get("error_description") || "Authentication failed";
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(desc)}`);
  }

  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const tokenHash = searchParams.get("token_hash");

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "email",
    });
    if (verifyError) {
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(verifyError.message)}`
      );
    }
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(exchangeError.message)}`
      );
    }

    if (type === "recovery") {
      return NextResponse.redirect(`${origin}/auth/reset-password`);
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
