import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, email, name, role, subscription_plan, reports_used_this_month, billing_period_start, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: reportCounts } = await supabase
      .from("reports")
      .select("user_id");

    const countMap = new Map<string, number>();
    for (const r of reportCounts || []) {
      countMap.set(r.user_id, (countMap.get(r.user_id) || 0) + 1);
    }

    const users = (profiles || []).map((p) => ({
      ...p,
      report_count: countMap.get(p.id) || 0,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { userId, role, subscription_plan } = await req.json();

    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const updates: Record<string, string> = {};
    if (role && (role === "admin" || role === "radiologist")) updates.role = role;
    if (subscription_plan && ["free", "starter", "professional"].includes(subscription_plan)) {
      updates.subscription_plan = subscription_plan;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { userId } = await req.json();

    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
