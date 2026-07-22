import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

// Public: resolve a hospital signup token → hospital name (so the form can
// greet the radiologist and confirm which hospital they're joining).
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("organizations")
    .select("id, name, is_active, max_seats")
    .eq("signup_token", token)
    .maybeSingle();

  if (error || !data || !data.is_active) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  return NextResponse.json({ hospital: { name: data.name } });
}
