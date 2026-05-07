import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    // Get month parameter (default: current month)
    const monthParam = req.nextUrl.searchParams.get("month"); // format: "2026-05"
    const now = new Date();
    const year = monthParam ? parseInt(monthParam.split("-")[0]) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam.split("-")[1]) - 1 : now.getMonth();
    const startDate = new Date(year, month, 1).toISOString();
    const endDate = new Date(year, month + 1, 1).toISOString();

    // Fetch audit logs with cost data for the month
    const { data: logs } = await supabase
      .from("audit_logs")
      .select("user_id, action, provider, model, input_tokens, output_tokens, estimated_cost_usd, duration_ms, created_at")
      .gte("created_at", startDate)
      .lt("created_at", endDate)
      .not("estimated_cost_usd", "is", null);

    // Fetch user profiles for display names
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email, subscription_plan");

    const profileMap = new Map(
      (profiles || []).map((p: { id: string; name: string; email: string; subscription_plan: string }) => [p.id, p]),
    );

    // Aggregate per user
    const userCosts: Record<string, {
      userId: string;
      name: string;
      email: string;
      plan: string;
      totalCost: number;
      breakdown: Record<string, { count: number; inputTokens: number; outputTokens: number; cost: number }>;
    }> = {};

    for (const log of (logs || [])) {
      if (!userCosts[log.user_id]) {
        const profile = profileMap.get(log.user_id);
        userCosts[log.user_id] = {
          userId: log.user_id,
          name: profile?.name || "Unknown",
          email: profile?.email || "",
          plan: profile?.subscription_plan || "free",
          totalCost: 0,
          breakdown: {},
        };
      }
      const u = userCosts[log.user_id];
      const cost = log.estimated_cost_usd || 0;
      u.totalCost += cost;

      const action = log.action || "other";
      if (!u.breakdown[action]) {
        u.breakdown[action] = { count: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
      }
      u.breakdown[action].count++;
      u.breakdown[action].inputTokens += log.input_tokens || 0;
      u.breakdown[action].outputTokens += log.output_tokens || 0;
      u.breakdown[action].cost += cost;
    }

    // Also calculate global aggregates
    let totalCost = 0;
    const globalBreakdown: Record<string, { count: number; cost: number }> = {};
    const providerBreakdown: Record<string, { count: number; cost: number }> = {};

    for (const log of (logs || [])) {
      const cost = log.estimated_cost_usd || 0;
      totalCost += cost;

      const action = log.action || "other";
      if (!globalBreakdown[action]) globalBreakdown[action] = { count: 0, cost: 0 };
      globalBreakdown[action].count++;
      globalBreakdown[action].cost += cost;

      const provider = log.provider || "unknown";
      if (!providerBreakdown[provider]) providerBreakdown[provider] = { count: 0, cost: 0 };
      providerBreakdown[provider].count++;
      providerBreakdown[provider].cost += cost;
    }

    // Sort users by total cost descending
    const sortedUsers = Object.values(userCosts).sort((a, b) => b.totalCost - a.totalCost);

    return NextResponse.json({
      month: `${year}-${String(month + 1).padStart(2, "0")}`,
      totalCost: Math.round(totalCost * 10000) / 10000,
      userCount: sortedUsers.length,
      users: sortedUsers.map(u => ({
        ...u,
        totalCost: Math.round(u.totalCost * 10000) / 10000,
        breakdown: Object.fromEntries(
          Object.entries(u.breakdown).map(([k, v]) => [k, { ...v, cost: Math.round(v.cost * 10000) / 10000 }])
        ),
      })),
      globalBreakdown: Object.fromEntries(
        Object.entries(globalBreakdown).map(([k, v]) => [k, { ...v, cost: Math.round(v.cost * 10000) / 10000 }])
      ),
      providerBreakdown: Object.fromEntries(
        Object.entries(providerBreakdown).map(([k, v]) => [k, { ...v, cost: Math.round(v.cost * 10000) / 10000 }])
      ),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
