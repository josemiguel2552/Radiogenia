import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const globalConfig = await getGlobalAIConfig();
    const apiKey = resolveApiKey(globalConfig, "openai");

    const { jobId } = await req.json();
    if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

    const res = await fetch(`https://api.openai.com/v1/fine_tuning/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.error?.message || "Failed to get status" }, { status: 500 });
    }

    const job = await res.json();

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      fineTunedModel: job.fine_tuned_model || null,
      trainedTokens: job.trained_tokens || null,
      error: job.error?.message || null,
      createdAt: job.created_at,
      finishedAt: job.finished_at || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await requireAdmin();
    const globalConfig = await getGlobalAIConfig();
    const apiKey = resolveApiKey(globalConfig, "openai");

    const [jobsRes, modelsRes] = await Promise.all([
      fetch("https://api.openai.com/v1/fine_tuning/jobs?limit=20", {
        headers: { Authorization: `Bearer ${apiKey}` },
      }),
      fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      }),
    ]);

    let jobs: { jobId: string; status: string; fineTunedModel: string | null; model: string; createdAt: number; finishedAt: number | null }[] = [];
    if (jobsRes.ok) {
      const data = await jobsRes.json();
      jobs = (data.data || []).map((job: Record<string, unknown>) => ({
        jobId: job.id as string,
        status: job.status as string,
        fineTunedModel: (job.fine_tuned_model as string) || null,
        model: job.model as string,
        createdAt: job.created_at as number,
        finishedAt: (job.finished_at as number) || null,
      }));
    }

    let ftModels: string[] = [];
    if (modelsRes.ok) {
      const modelsData = await modelsRes.json();
      ftModels = (modelsData.data || [])
        .filter((m: Record<string, unknown>) => (m.owned_by as string)?.startsWith("user-") || (m.owned_by as string)?.startsWith("organization-") || (m.id as string)?.startsWith("ft:"))
        .map((m: Record<string, unknown>) => m.id as string);
    }

    return NextResponse.json({ jobs, ftModels });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
