import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data, error } = await service
      .from("resident_verifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return dbErrorResponse(error);
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`res-verify:${user.id}`, RATE_LIMITS.public);
    if (!rl.allowed) return rl.errorResponse!;

    const formData = await req.formData();
    const file = formData.get("document") as File | null;
    const institutionName = formData.get("institution_name") as string || "";
    const residencyStart = formData.get("residency_start") as string;
    const residencyEnd = formData.get("residency_end") as string;

    if (!file) return NextResponse.json({ error: "Document is required" }, { status: 400 });
    if (!residencyStart || !residencyEnd) {
      return NextResponse.json({ error: "Residency start and end dates are required" }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 2 MB" }, { status: 400 });
    }

    const service = createServiceClient();

    const { data: existing, error: existingError } = await service
      .from("resident_verifications")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingError) {
      console.error("[resident-verification] check existing error:", existingError.message, existingError);
      return NextResponse.json({ error: `DB check failed: ${existingError.message}` }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ error: "You already have a pending verification request" }, { status: 409 });
    }

    let dataUrl: string;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      dataUrl = `data:${file.type};base64,${base64}`;
    } catch (err) {
      console.error("[resident-verification] file read error:", err);
      return NextResponse.json({ error: "Failed to read uploaded file" }, { status: 500 });
    }

    const { data: verification, error: insertError } = await service
      .from("resident_verifications")
      .insert({
        user_id: user.id,
        document_url: dataUrl,
        institution_name: institutionName,
        residency_start: residencyStart,
        residency_end: residencyEnd,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[resident-verification] insert error:", insertError.message, insertError);
      return NextResponse.json({ error: `DB insert failed: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json(verification);
  } catch (error) {
    return toErrorResponse(error);
  }
}
