import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();
    const supabase = createServiceClient();

    const { data: users } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalized)
      .limit(1);

    if (users && users.length > 0) {
      return NextResponse.json({ status: "registered" });
    }

    const { data: waitlistEntry } = await supabase
      .from("waitlist")
      .select("id")
      .eq("email", normalized)
      .limit(1);

    if (waitlistEntry && waitlistEntry.length > 0) {
      return NextResponse.json({ status: "waitlisted" });
    }

    return NextResponse.json({ status: "unknown" });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
