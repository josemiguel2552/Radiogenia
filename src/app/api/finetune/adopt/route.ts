import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";
import { adoptJobs } from "@/lib/finetune-jobs";
import { finetuneSpec } from "@/lib/finetune-providers";

export const dynamic = "force-dynamic";

/**
 * Hand over job ids that only ever existed in one browser.
 *
 * Jobs launched before the jobs table existed were remembered in the
 * localStorage of whichever device started them — so a run begun on a phone
 * was invisible from a desktop. This lets that device give them up once, and
 * then forget them.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAdmin();
    const { provider, jobIds } = await req.json();
    const spec = finetuneSpec(String(provider || "openai"));
    if (!Array.isArray(jobIds)) {
      return NextResponse.json({ error: "jobIds must be an array" }, { status: 400 });
    }
    const adopted = await adoptJobs(spec.id, jobIds, userId);
    return NextResponse.json({ provider: spec.id, adopted });
  } catch (error) {
    return toErrorResponse(error);
  }
}
