import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { toErrorResponse } from "@/lib/api-error";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    // Source of truth: the latest verification request in the table.
    const { data: latest } = await service
      .from("resident_verifications")
      .select("id, status, institution_name, residency_start, residency_end, admin_notes, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Also expose whether the resident plan is already active (paid), so the
    // UI can distinguish "approved — pay now" from "already subscribed".
    const { data: profile } = await service
      .from("profiles")
      .select("subscription_plan")
      .eq("id", user.id)
      .single();

    if (!latest) return NextResponse.json(null);
    return NextResponse.json({ ...latest, plan_active: profile?.subscription_plan === "resident" });
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
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 5 MB" }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("email, name")
      .eq("id", user.id)
      .single();

    const userName = profile?.name || user.email || "Unknown";
    const userEmail = profile?.email || user.email || "";

    // Don't allow stacking multiple open requests.
    const { data: openReq } = await service
      .from("resident_verifications")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["pending", "approved"])
      .limit(1)
      .maybeSingle();
    if (openReq) {
      return NextResponse.json({ error: "You already have a verification in progress" }, { status: 409 });
    }

    // 1) Store the certificate in the private resident-docs bucket.
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${user.id}/${Date.now()}.${ext}`;

    // Ensure the bucket exists (no-op if already created).
    await service.storage.createBucket("resident-docs", { public: false }).catch(() => {});
    const { error: uploadError } = await service.storage
      .from("resident-docs")
      .upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: true });
    if (uploadError) {
      console.error("[resident-verification] upload error:", uploadError.message);
      return NextResponse.json({ error: "Failed to store the document" }, { status: 500 });
    }

    // 2) Create the verification request the admin reviews in the dashboard.
    const { error: insertError } = await service
      .from("resident_verifications")
      .insert({
        user_id: user.id,
        document_url: path,
        institution_name: institutionName,
        residency_start: residencyStart,
        residency_end: residencyEnd,
        status: "pending",
      });
    if (insertError) {
      console.error("[resident-verification] insert error:", insertError.message);
      return NextResponse.json({ error: "Failed to create the verification request" }, { status: 500 });
    }

    // 3) Notify the admin (best-effort — the dashboard is the source of truth).
    if (ADMIN_EMAILS.length > 0 && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      resend.emails.send({
        from: process.env.EMAIL_FROM || "Radiogen.AI <noreply@radiogen.ai>",
        to: ADMIN_EMAILS,
        subject: `Verificación de residente: ${userName} (${userEmail})`,
        html: `
          <h2>Nueva solicitud de verificación de residente</h2>
          <table style="border-collapse:collapse;">
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Usuario:</td><td>${userName}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email:</td><td>${userEmail}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Institución:</td><td>${institutionName || "—"}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Periodo:</td><td>${residencyStart} → ${residencyEnd}</td></tr>
          </table>
          <p>Revísala en el panel de admin → pestaña Residentes (ver documento y aprobar/rechazar).</p>
        `,
      }).catch((err) => console.error("[resident-verification] email error:", err instanceof Error ? err.message : err));
    }

    return NextResponse.json({ status: "pending" });
  } catch (error) {
    return toErrorResponse(error);
  }
}
