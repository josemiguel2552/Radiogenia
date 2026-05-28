import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const path = req.nextUrl.searchParams.get("path");
    if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 });

    const service = createServiceClient();
    const { data, error } = await service.storage
      .from("resident-docs")
      .createSignedUrl(path, 300);

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: error?.message || "Failed to generate URL" }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    return toErrorResponse(error);
  }
}
