import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEnterpriseInquiryNotification, sendEnterpriseInquiryAck } from "@/lib/email";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { dbErrorResponse } from "@/lib/api-error";

/**
 * Landing page pricing section → "Solicitar cotización" (Enterprise plan).
 * Anonymous, unauthenticated: captures name/email/message, stores it for the
 * admin panel (Waitlist → Enterprise), pings the team by email immediately,
 * and sends the visitor a short acknowledgement.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`enterprise-inquiry:${ip}`, RATE_LIMITS.public);
    if (!rl.allowed) return rl.errorResponse!;

    const { name, email, message, lang } = await req.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (message.trim().length > 4000) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    const cleanName = name.trim().slice(0, 200);
    const cleanEmail = email.trim().toLowerCase().slice(0, 300);
    const cleanMessage = message.trim().slice(0, 4000);
    const emailLang = lang === "en" || lang === "pt" ? lang : "es";

    const supabase = createServiceClient();
    const { error } = await supabase.from("enterprise_inquiries").insert({
      name: cleanName,
      email: cleanEmail,
      message: cleanMessage,
    });

    if (error) {
      if (error.message?.includes("enterprise_inquiries")) {
        return NextResponse.json({ error: "Not available yet, please email us directly" }, { status: 503 });
      }
      return dbErrorResponse(error);
    }

    sendEnterpriseInquiryNotification(cleanName, cleanEmail, cleanMessage).catch(() => {});
    sendEnterpriseInquiryAck(cleanEmail, cleanName, emailLang).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
