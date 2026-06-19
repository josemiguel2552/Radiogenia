import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "email" | "magiclink",
    });
    if (verifyError) {
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(verifyError.message)}`
      );
    }

    if (data.user) {
      const service = createServiceClient();
      await service
        .from("profiles")
        .update({ email_verified: true })
        .eq("id", data.user.id);
    }

    const plan = searchParams.get("plan");
    if (plan === "resident") {
      return NextResponse.redirect(`${origin}/auth/verify-resident`);
    }
    if (plan && plan !== "free") {
      return NextResponse.redirect(`${origin}/api/checkout?plan=${encodeURIComponent(plan)}`);
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
