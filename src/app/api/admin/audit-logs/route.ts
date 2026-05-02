import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);

    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (action) query = query.eq("action", action);

    const { data, error } = await query;
    if (error) {
      if (error.message?.includes("audit_logs")) {
        return NextResponse.json({ logs: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userIds = [...new Set((data || []).map((l: { user_id: string }) => l.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, name")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles || []).map((p: { id: string; email: string; name: string }) => [p.id, p]),
    );

    const logs = (data || []).map((log: Record<string, unknown>) => ({
      ...log,
      user_email: (profileMap.get(log.user_id as string) as { email?: string })?.email || "—",
      user_name: (profileMap.get(log.user_id as string) as { name?: string })?.name || "—",
    }));

    return NextResponse.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
