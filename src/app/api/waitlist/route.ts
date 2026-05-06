import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  try {
    const { name, email, country, hospital, role } = await req.json();

    if (!name?.trim() || !email?.trim() || !country?.trim() || !hospital?.trim() || !role) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (!["attending", "resident"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from("waitlist").upsert(
      { name: name.trim(), email: email.trim().toLowerCase(), country: country.trim(), hospital: hospital.trim(), role },
      { onConflict: "email", ignoreDuplicates: true },
    );

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
