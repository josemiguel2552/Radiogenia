export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrgMembership } from "@/lib/auth-helpers";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

const CURRENT_VERSION = "1.0";
const REQUIRED_DOCUMENTS = ["terms_of_use", "privacy_policy", "data_processing", "ai_disclaimer"] as const;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await getOrgMembership(user.id);
    if (!membership) {
      return NextResponse.json({ required: false });
    }

    const service = createServiceClient();
    const { data: records } = await service
      .from("consent_records")
      .select("document_type, document_version")
      .eq("user_id", user.id)
      .eq("document_version", CURRENT_VERSION);

    const accepted = new Set((records || []).map((r) => r.document_type));
    const pending = REQUIRED_DOCUMENTS.filter((d) => !accepted.has(d));

    return NextResponse.json({
      required: pending.length > 0,
      pending,
      accepted: Array.from(accepted),
      version: CURRENT_VERSION,
      org_name: membership.org_name,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await getOrgMembership(user.id);
    if (!membership) {
      return NextResponse.json({ error: "Not an org member" }, { status: 400 });
    }

    const { documents } = await req.json();
    if (!Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json({ error: "No documents specified" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const service = createServiceClient();

    const records = documents
      .filter((d: string) => REQUIRED_DOCUMENTS.includes(d as typeof REQUIRED_DOCUMENTS[number]))
      .map((d: string) => ({
        user_id: user.id,
        org_id: membership.org_id,
        document_type: d,
        document_version: CURRENT_VERSION,
        ip_address: ip,
        user_agent: userAgent.slice(0, 500),
      }));

    const { error } = await service
      .from("consent_records")
      .upsert(records, { onConflict: "user_id,document_type,document_version", ignoreDuplicates: true });

    if (error) return dbErrorResponse(error);

    const allAccepted = documents.length >= REQUIRED_DOCUMENTS.length;
    if (allAccepted) {
      await service
        .from("org_members")
        .update({ consent_accepted_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("org_id", membership.org_id);
    }

    return NextResponse.json({ ok: true, all_accepted: allAccepted });
  } catch (error) {
    return toErrorResponse(error);
  }
}
