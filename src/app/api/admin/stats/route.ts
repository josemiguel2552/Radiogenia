import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, role, subscription_plan, reports_used_this_month, dictation_seconds_used, created_at");

    const { data: reports } = await supabase
      .from("reports")
      .select("id, user_id, modality, created_at")
      .order("created_at", { ascending: false });

    const users = profiles || [];
    const allReports = reports || [];

    const totalUsers = users.filter((u) => u.role !== "admin").length;
    const totalReports = allReports.length;
    const activeThisMonth = users.filter((u) => u.role !== "admin" && (u.reports_used_this_month || 0) > 0).length;

    const planCounts = { free: 0, starter: 0, professional: 0 };
    let totalDictationMinutes = 0;
    for (const u of users) {
      if (u.role === "admin") continue;
      const plan = u.subscription_plan || "free";
      if (plan in planCounts) planCounts[plan as keyof typeof planCounts]++;
      totalDictationMinutes += Math.round((u.dictation_seconds_used || 0) / 60);
    }

    const mrr = planCounts.starter * 7.99 + planCounts.professional * 15.99;

    const reportsThisMonth = allReports.filter((r) => {
      const d = new Date(r.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    // Reports per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const reportsPerDay: Record<string, number> = {};
    for (const r of allReports) {
      const d = new Date(r.created_at);
      if (d >= thirtyDaysAgo) {
        const key = d.toISOString().split("T")[0];
        reportsPerDay[key] = (reportsPerDay[key] || 0) + 1;
      }
    }

    // Reports per modality
    const modalityCounts: Record<string, number> = {};
    for (const r of allReports) {
      modalityCounts[r.modality] = (modalityCounts[r.modality] || 0) + 1;
    }

    // New users per day (last 30 days)
    const usersPerDay: Record<string, number> = {};
    for (const u of users) {
      const d = new Date(u.created_at);
      if (d >= thirtyDaysAgo) {
        const key = d.toISOString().split("T")[0];
        usersPerDay[key] = (usersPerDay[key] || 0) + 1;
      }
    }

    return NextResponse.json({
      totalUsers,
      totalReports,
      reportsThisMonth,
      activeThisMonth,
      planCounts,
      mrr: Math.round(mrr * 100) / 100,
      totalDictationMinutes,
      reportsPerDay,
      modalityCounts,
      usersPerDay,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
