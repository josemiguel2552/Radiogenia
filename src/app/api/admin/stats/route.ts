import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [{ data: profiles }, { data: reports }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, role, subscription_plan, reports_used_this_month, dictation_seconds_used, created_at"),
      supabase
        .from("reports")
        .select("id, user_id, modality, created_at")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false }),
    ]);

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

    const now = new Date();
    const reportsThisMonth = allReports.filter((r) => {
      const d = new Date(r.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const reportsPerDay: Record<string, number> = {};
    const modalityCounts: Record<string, number> = {};
    for (const r of allReports) {
      const key = new Date(r.created_at).toISOString().split("T")[0];
      reportsPerDay[key] = (reportsPerDay[key] || 0) + 1;
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
    return toErrorResponse(error);
  }
}
