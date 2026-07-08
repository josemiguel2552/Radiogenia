import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { toErrorResponse } from "@/lib/api-error";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

// Where the uploaded residency certificate is archived (silently — the
// resident is never told this happens). Access is no longer gated on a human
// reviewing it; this is a record-keeping copy only.
const RESIDENT_DOCS_EMAIL = process.env.RESIDENT_DOCS_EMAIL || "info@radiogen.ai";

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

    // Ensure the bucket exists (no-op if already created — the "already
    // exists" error here is expected and fine to ignore; anything else is
    // logged so a misconfigured/missing bucket is visible in server logs).
    const { error: bucketError } = await service.storage.createBucket("resident-docs", { public: false });
    if (bucketError && !/already exists/i.test(bucketError.message)) {
      console.error("[resident-verification] createBucket error:", bucketError.message);
    }
    const { error: uploadError } = await service.storage
      .from("resident-docs")
      .upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: true });
    if (uploadError) {
      console.error("[resident-verification] upload error:", uploadError.message);
      return NextResponse.json({ error: "Failed to store the document" }, { status: 500 });
    }

    // 2) Auto-approve on upload: access no longer waits on a human review —
    // the resident can pay and get access immediately. The document is kept
    // (in storage + emailed below) purely for record-keeping.
    const now = new Date().toISOString();
    const { data: inserted, error: insertError } = await service
      .from("resident_verifications")
      .insert({
        user_id: user.id,
        document_url: path,
        institution_name: institutionName,
        residency_start: residencyStart,
        residency_end: residencyEnd,
        status: "approved",
        reviewed_at: now,
        admin_notes: "Auto-approved on upload; certificate archived by email.",
      })
      .select("id, status, institution_name, residency_start, residency_end, admin_notes, created_at")
      .single();
    if (insertError || !inserted) {
      console.error("[resident-verification] insert error:", insertError?.message);
      return NextResponse.json({ error: "Failed to create the verification request" }, { status: 500 });
    }

    // 3) Archive the certificate by email (silent — never surfaced to the
    // resident). Best-effort: must never block the user's access.
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || `certificado.${ext}`;
      resend.emails.send({
        from: process.env.EMAIL_FROM || "Radiogen.AI <noreply@radiogen.ai>",
        to: RESIDENT_DOCS_EMAIL,
        subject: `Certificado de residente: ${userName} (${userEmail})`,
        html: `
          <h2>Certificado de residencia subido (acceso auto-concedido)</h2>
          <table style="border-collapse:collapse;">
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Usuario:</td><td>${userName}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email:</td><td>${userEmail}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Institución:</td><td>${institutionName || "—"}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Periodo:</td><td>${residencyStart} → ${residencyEnd}</td></tr>
          </table>
          <p>El acceso al plan residente se concede automáticamente en cuanto pague. Certificado adjunto para archivo.</p>
        `,
        attachments: [{ filename: safeName, content: buffer, contentType: file.type || "application/octet-stream" }],
      }).catch((err) => console.error("[resident-verification] archive email error:", err instanceof Error ? err.message : err));
    }

    return NextResponse.json({ ...inserted, plan_active: false });
  } catch (error) {
    return toErrorResponse(error);
  }
}
