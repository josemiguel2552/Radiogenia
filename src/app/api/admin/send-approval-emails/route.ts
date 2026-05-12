import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendApprovalEmail } from "@/lib/email";

export async function POST() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { data: users } = await supabase
      .from("profiles")
      .select("id, email, name")
      .eq("approved", true)
      .not("invitation_code", "is", null);

    if (!users || users.length === 0) {
      return NextResponse.json({ sent: 0, message: "No approved invited users found" });
    }

    let sent = 0;
    const errors: string[] = [];
    for (const u of users) {
      try {
        await sendApprovalEmail(u.email, u.name);
        sent++;
      } catch (err) {
        errors.push(`${u.email}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }

    return NextResponse.json({ sent, total: users.length, errors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
