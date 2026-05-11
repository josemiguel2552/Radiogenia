import { createServiceClient } from "@/lib/supabase/service";
import { calculateCost, calculateAudioCost } from "@/lib/ai-pricing";

interface LogAICostParams {
  userId: string;
  action: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

interface LogAudioCostParams {
  userId: string;
  action: string;
  provider: string;
  model: string;
  durationSeconds: number;
}

export async function logAICost(params: LogAICostParams): Promise<void> {
  try {
    const cost = calculateCost(params.model, params.inputTokens, params.outputTokens);
    const supabase = createServiceClient();
    await supabase.from("audit_logs").insert({
      user_id: params.userId,
      action: params.action,
      provider: params.provider,
      model: params.model,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      estimated_cost_usd: cost,
    });
  } catch {
    console.error("[logAICost] failed to log cost", params.action);
  }
}

export async function logAudioCost(params: LogAudioCostParams): Promise<void> {
  try {
    const cost = calculateAudioCost(params.model, params.durationSeconds);
    const supabase = createServiceClient();
    await supabase.from("audit_logs").insert({
      user_id: params.userId,
      action: params.action,
      provider: params.provider,
      model: params.model,
      input_tokens: 0,
      output_tokens: 0,
      duration_ms: Math.round(params.durationSeconds * 1000),
      estimated_cost_usd: cost,
    });
  } catch {
    console.error("[logAudioCost] failed to log cost", params.action);
  }
}
