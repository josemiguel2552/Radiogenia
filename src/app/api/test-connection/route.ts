import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { testConnection } from "@/lib/ai-provider";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import type { AIProvider } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`test-conn:${user.id}`, RATE_LIMITS.public);
    if (!rl.allowed) return rl.errorResponse!;

    const { provider, modelName, apiKey, customBaseUrl } = await req.json();

    const success = await testConnection({
      provider: provider as AIProvider,
      modelName,
      apiKey,
      customBaseUrl,
    });

    return NextResponse.json({ success });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message });
  }
}
