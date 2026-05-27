import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendWaitlistConfirmation } from "@/lib/email";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { dbErrorResponse } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`waitlist:${ip}`, RATE_LIMITS.public);
    if (!rl.allowed) return rl.errorResponse!;

    const { firstName, lastName, email, country, hospital, role } = await req.json();

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !country?.trim() || !hospital?.trim() || !role) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (!["attending", "resident"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from("waitlist").upsert(
      { first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim().toLowerCase(), country: country.trim(), hospital: hospital.trim(), role },
      { onConflict: "email", ignoreDuplicates: true },
    );

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      return dbErrorResponse(error);
    }

    sendWaitlistConfirmation(email.trim().toLowerCase(), firstName.trim()).catch((err) => {
      console.error("[waitlist] email error:", err instanceof Error ? err.message : err);
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
