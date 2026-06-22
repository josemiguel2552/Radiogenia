import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { toErrorResponse } from "@/lib/api-error";
import { DEFAULT_CHECKLIST_SECTIONS, type ChecklistSection } from "@/lib/clinical-checklist-kb";

export async function GET() {
  try {
    await requireAdmin();
    const service = createServiceClient();
    const { data, error } = await service
      .from("global_model_config")
      .select("clinical_checklist_kb")
      .single();
    if (error) throw error;

    let sections: ChecklistSection[] = DEFAULT_CHECKLIST_SECTIONS;
    if (data?.clinical_checklist_kb?.trim()) {
      try {
        const parsed = JSON.parse(data.clinical_checklist_kb);
        if (Array.isArray(parsed) && parsed.length > 0) sections = parsed;
      } catch {
        // invalid JSON, use default
      }
    }
    return NextResponse.json({ sections });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await requireAdmin();
    const { sections } = (await req.json()) as { sections: ChecklistSection[] };
    const service = createServiceClient();
    const { error } = await service
      .from("global_model_config")
      .update({
        clinical_checklist_kb: JSON.stringify(sections),
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .not("id", "is", null);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
