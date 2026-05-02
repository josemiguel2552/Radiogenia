import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getGlobalAIConfig } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const globalConfig = await getGlobalAIConfig();
    const apiKey = globalConfig.apiKey;

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
    const apiKey = globalConfig.apiKey;

    const res = await fetch("https://api.openai.com/v1/fine_tuning/jobs?limit=10", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      return NextResponse.json({ jobs: [] });
    }

    const data = await res.json();
    const jobs = (data.data || []).map((job: Record<string, unknown>) => ({
      jobId: job.id,
      status: job.status,
      fineTunedModel: job.fine_tuned_model || null,
      model: job.model,
      createdAt: job.created_at,
      finishedAt: job.finished_at || null,
    }));

    return NextResponse.json({ jobs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
