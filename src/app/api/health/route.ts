import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};
  let healthy = true;

  try {
    const sb = createServiceClient();
    const { error } = await sb.from("profiles").select("id").limit(1);
    checks.database = error ? "error" : "ok";
    if (error) healthy = false;
  } catch {
    checks.database = "error";
    healthy = false;
  }

  checks.server = "ok";

  return NextResponse.json(
    { status: healthy ? "healthy" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503 },
  );
}
