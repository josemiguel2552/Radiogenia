export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrgMembership } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ should_show: false });

    const membership = await getOrgMembership(user.id);
    if (!membership) return NextResponse.json({ should_show: false });

    const service = createServiceClient();

    const { data: org } = await service
      .from("organizations")
      .select("is_pilot")
      .eq("id", membership.org_id)
      .single();

    if (!org?.is_pilot) return NextResponse.json({ should_show: false });

    const { data: existing } = await service
      .from("pilot_survey_responses")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) return NextResponse.json({ should_show: false });

    const { count } = await service
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    return NextResponse.json({ should_show: (count || 0) >= 100 });
  } catch {
    return NextResponse.json({ should_show: false });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { score, feedback_text } = await req.json();
    if (!score || score < 1 || score > 5) {
      return NextResponse.json({ error: "Score must be 1-5" }, { status: 400 });
    }

    const membership = await getOrgMembership(user.id);
    const service = createServiceClient();

    await service.from("pilot_survey_responses").upsert({
      user_id: user.id,
      org_id: membership?.org_id || null,
      score,
      feedback_text: (feedback_text || "").slice(0, 2000),
    }, { onConflict: "user_id" });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
