import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendApprovalEmail } from "@/lib/email";
import { toErrorResponse } from "@/lib/api-error";

export async function POST() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { data: users } = await supabase
      .from("profiles")
      .select("id, email, name, role")
      .eq("approved", true);

    const filtered = (users || []).filter((u) => u.role !== "admin");

    if (filtered.length === 0) {
      return NextResponse.json({ sent: 0, message: "No users found" });
    }

    let sent = 0;
    const errors: string[] = [];
    for (const u of filtered) {
      try {
        await sendApprovalEmail(u.email, u.name);
        sent++;
      } catch (err) {
        errors.push(`${u.email}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }

    return NextResponse.json({ sent, total: filtered.length, errors });
  } catch (error) {
    return toErrorResponse(error);
  }
}
