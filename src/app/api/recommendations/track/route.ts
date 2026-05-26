import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { recommendation_ids } = await req.json();
    if (!Array.isArray(recommendation_ids) || recommendation_ids.length === 0) {
      return NextResponse.json({ error: "recommendation_ids required" }, { status: 400 });
    }

    const { data: existingRows } = await supabase
      .from("recommendation_usage")
      .select("id, recommendation_id, usage_count")
      .eq("user_id", user.id)
      .in("recommendation_id", recommendation_ids);

    const existingMap = new Map(
      (existingRows || []).map((r: { id: string; recommendation_id: string; usage_count: number }) => [r.recommendation_id, r]),
    );

    const updates: PromiseLike<unknown>[] = [];
    const inserts: { user_id: string; recommendation_id: string; usage_count: number }[] = [];
    const now = new Date().toISOString();

    for (const recId of recommendation_ids) {
      const existing = existingMap.get(recId);
      if (existing) {
        updates.push(
          supabase
            .from("recommendation_usage")
            .update({ usage_count: existing.usage_count + 1, last_used_at: now })
            .eq("id", existing.id),
        );
      } else {
        inserts.push({ user_id: user.id, recommendation_id: recId, usage_count: 1 });
      }
    }

    if (inserts.length > 0) updates.push(supabase.from("recommendation_usage").insert(inserts));
    await Promise.all(updates);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
