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

    const service = createServiceClient();

    // Check for existing pending verification
    const { data: existing } = await service
      .from("resident_verifications")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "You already have a pending verification request" }, { status: 409 });
    }

    // Upload document to resident-docs bucket
    const ext = file.name.split(".").pop() || "pdf";
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await service.storage
      .from("resident-docs")
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    // Create verification record
    const { data: verification, error: insertError } = await service
      .from("resident_verifications")
      .insert({
        user_id: user.id,
        document_url: filePath,
        institution_name: institutionName,
        residency_start: residencyStart,
        residency_end: residencyEnd,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(verification);
  } catch (error) {
    return toErrorResponse(error);
  }
}
