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

    for (const recId of recommendation_ids) {
      const { data: existing } = await supabase
        .from("recommendation_usage")
        .select("id, usage_count")
        .eq("user_id", user.id)
        .eq("recommendation_id", recId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("recommendation_usage")
          .update({ usage_count: existing.usage_count + 1, last_used_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("recommendation_usage")
          .insert({ user_id: user.id, recommendation_id: recId, usage_count: 1 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
