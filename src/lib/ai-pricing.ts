export interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

// Pricing as of mid-2025 (approximate)
const MODEL_PRICING: Record<string, ModelPricing> = {
  // Anthropic
  "claude-sonnet-4-6-20250514": { inputPer1M: 3, outputPer1M: 15 },
  "claude-haiku-4-5-20251001": { inputPer1M: 0.80, outputPer1M: 4 },
  // OpenAI
  "gpt-4o": { inputPer1M: 2.50, outputPer1M: 10 },
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.60 },
  "gpt-4o-mini-2024-07-18": { inputPer1M: 0.15, outputPer1M: 0.60 },
  // DeepSeek
  "deepseek-v4-pro": { inputPer1M: 0.435, outputPer1M: 0.87 },
  "deepseek-v4-flash": { inputPer1M: 0.14, outputPer1M: 0.28 },
  "deepseek-chat": { inputPer1M: 0.14, outputPer1M: 0.28 },
  "deepseek-reasoner": { inputPer1M: 0.55, outputPer1M: 2.19 },
  // Google
  "gemini-1.5-pro": { inputPer1M: 1.25, outputPer1M: 5 },
  "gemini-2.0-flash": { inputPer1M: 0.10, outputPer1M: 0.40 },
  // Whisper
  "whisper-1": { inputPer1M: 0, outputPer1M: 0 }, // billed by duration
};

// Whisper/Deepgram pricing per minute
export const AUDIO_PRICING: Record<string, number> = {
  "whisper-1": 0.006,
  "deepgram-nova-2": 0.0043,
};

export function getModelPricing(model: string): ModelPricing {
  return MODEL_PRICING[model] || MODEL_PRICING["gpt-4o-mini"]; // fallback
}

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = getModelPricing(model);
  return (inputTokens * pricing.inputPer1M + outputTokens * pricing.outputPer1M) / 1_000_000;
}

export function calculateAudioCost(model: string, durationSeconds: number): number {
  const perMinute = AUDIO_PRICING[model] || AUDIO_PRICING["whisper-1"];
  return (durationSeconds / 60) * perMinute;
}
