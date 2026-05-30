import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("audit_logs")
      .select("metadata, created_at")
      .eq("action", "pii_stripped")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data || []) as { metadata: { endpoint?: string; strippedCount?: number; strippedTypes?: Record<string, number> } | null; created_at: string }[];

    let totalEvents = 0;
    let totalStripped = 0;
    const byType: Record<string, number> = {};
    const byEndpoint: Record<string, number> = {};
    const last7days: Record<string, number> = {};

    const now = Date.now();
    const day7ago = now - 7 * 24 * 60 * 60 * 1000;

    for (const row of rows) {
      const m = row.metadata;
      if (!m || !m.strippedCount) continue;

      totalEvents++;
      totalStripped += m.strippedCount;

      if (m.endpoint) {
        byEndpoint[m.endpoint] = (byEndpoint[m.endpoint] || 0) + m.strippedCount;
      }

      if (m.strippedTypes) {
        for (const [type, count] of Object.entries(m.strippedTypes)) {
          byType[type] = (byType[type] || 0) + count;
        }
      }

      const ts = new Date(row.created_at).getTime();
      if (ts >= day7ago) {
        const day = row.created_at.slice(0, 10);
        last7days[day] = (last7days[day] || 0) + m.strippedCount;
      }
    }

    return NextResponse.json({
      totalEvents,
      totalStripped,
      byType,
      byEndpoint,
      last7days,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
