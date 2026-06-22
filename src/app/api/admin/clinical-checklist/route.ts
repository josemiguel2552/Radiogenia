import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { createServiceClient } from "@/lib/supabase/service";
import { toErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    await requireAdmin();
    const service = createServiceClient();
    const { data, error } = await service
      .from("global_model_config")
      .select("clinical_checklist_kb")
      .single();
    if (error) throw error;
    return NextResponse.json({ kb: data?.clinical_checklist_kb || "" });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await requireAdmin();
    const { kb } = (await req.json()) as { kb: string };
    const service = createServiceClient();
    const { error } = await service
      .from("global_model_config")
      .update({
        clinical_checklist_kb: kb ?? "",
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
