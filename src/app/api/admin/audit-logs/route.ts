import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 500);
    const cursor = url.searchParams.get("cursor");

    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (action) query = query.eq("action", action);
    if (cursor) query = query.lt("created_at", cursor);

    const { data, error } = await query;
    if (error) {
      if (error.message?.includes("audit_logs")) {
        return NextResponse.json({ logs: [], nextCursor: null });
      }
      return dbErrorResponse(error);
    }

    const rows = data || [];
    const nextCursor = rows.length === limit
      ? (rows[rows.length - 1] as { created_at: string }).created_at
      : null;

    const userIds = [...new Set(rows.map((l: { user_id: string }) => l.user_id))];
    let profileMap = new Map<string, { email: string; name: string }>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, name")
        .in("id", userIds);

      profileMap = new Map(
        (profiles || []).map((p: { id: string; email: string; name: string }) => [p.id, p]),
      );
    }

    const logs = rows.map((log: Record<string, unknown>) => ({
      ...log,
      user_email: (profileMap.get(log.user_id as string) as { email?: string })?.email || "—",
      user_name: (profileMap.get(log.user_id as string) as { name?: string })?.name || "—",
    }));

    return NextResponse.json({ logs, nextCursor });
  } catch (error) {
    return toErrorResponse(error);
  }
}
