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
    const { data: profile } = await service
      .from("profiles")
      .select("pending_checkout_plan, professional_role")
      .eq("id", user.id)
      .single();

    if (profile?.pending_checkout_plan === "resident") {
      return NextResponse.json({ status: "pending" });
    }
    if (profile?.professional_role === "resident" && !profile?.pending_checkout_plan) {
      return NextResponse.json({ status: "approved" });
    }

    return NextResponse.json(null);
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

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    if (ADMIN_EMAILS.length === 0) {
      console.error("[resident-verification] ADMIN_EMAILS not configured");
      return NextResponse.json({ error: "Admin email not configured" }, { status: 503 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: emailError } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Radiogen.AI <noreply@radiogen.ai>",
      to: ADMIN_EMAILS,
      subject: `Verificación de residente: ${userName} (${userEmail})`,
      html: `
        <h2>Nueva solicitud de verificación de residente</h2>
        <table style="border-collapse:collapse;">
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Usuario:</td><td>${userName}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email:</td><td>${userEmail}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Institución:</td><td>${institutionName || "—"}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Inicio residencia:</td><td>${residencyStart}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Fin residencia:</td><td>${residencyEnd}</td></tr>
        </table>
        <p>Documento adjunto. Para aprobar, ve al panel de admin → Usuarios → busca el email → Aprobar.</p>
      `,
      attachments: [
        {
          filename: file.name,
          content: base64,
        },
      ],
    });

    if (emailError) {
      console.error("[resident-verification] email error:", emailError);
      return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
    }

    return NextResponse.json({ status: "pending" });
  } catch (error) {
    return toErrorResponse(error);
  }
}
