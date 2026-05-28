import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { generateAI } from "@/lib/ai-provider";
import { toErrorResponse } from "@/lib/api-error";
import type { AIProvider } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface TrainingExample {
  messages: ChatMessage[];
}

const AUGMENT_SYSTEM = `You are a data augmentation engine for radiology report training data.
Given a real training example where:
- The USER message contains the study type and radiologist-corrected findings
- The ASSISTANT message contains the radiologist-corrected conclusion derived ONLY from those findings

Generate a NEW synthetic example that:

1. Uses a DIFFERENT study case (different anatomy, different findings) but the SAME modality
2. Matches the SAME writing style, sentence structure, terminology level, and conclusion length as the original
3. Has realistic radiology findings
4. The conclusion MUST ONLY reference findings that appear in the findings text — no hallucinated information
5. The system message must remain EXACTLY the same
6. The conclusion should show the same TYPE of summarization patterns as the original (e.g., if it groups findings by region, the synthetic should too; if it uses bullet points, use them too)

Output ONLY a valid JSON object with a "messages" array containing system, user, and assistant messages. No markdown, no explanation.`;

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const { examples } = await req.json() as { examples: TrainingExample[] };
    if (!examples || examples.length === 0) {
      return NextResponse.json({ error: "No examples provided" }, { status: 400 });
    }

    const globalConfig = await getGlobalAIConfig();
    const taskOverride = globalConfig.taskOverrides?.data_augmentation;
    const provider = (taskOverride?.provider || globalConfig.provider || "openai") as AIProvider;
    const modelName = taskOverride?.modelName || globalConfig.modelName || "gpt-4o-mini";
    const apiKey = resolveApiKey(globalConfig, provider);

    if (!apiKey) {
      return NextResponse.json({ error: `No API key configured for "${provider}"` }, { status: 500 });
    }

    const synthetic: TrainingExample[] = [];
    const errors: string[] = [];
    const batchSize = 3;

    for (let i = 0; i < examples.length; i += batchSize) {
      const batch = examples.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map(async (example, idx) => {
          try {
            const exampleJson = JSON.stringify(example, null, 2);
            const userPrompt = `Here is a real training example:\n\n${exampleJson}\n\nGenerate ONE new synthetic training example following the rules. The conclusion MUST ONLY mention findings present in the findings text. Output only the JSON object.`;

            const text = await generateAI({
              provider,
              modelName,
              apiKey,
              customBaseUrl: globalConfig.customBaseUrl,
              system: AUGMENT_SYSTEM,
              user: userPrompt,
              maxTokens: 4096,
            });

            const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
            const parsed = JSON.parse(cleaned) as TrainingExample;

            if (!parsed.messages || !Array.isArray(parsed.messages)) {
              errors.push(`Example ${i + idx}: invalid structure`);
              return null;
            }
            const roles = parsed.messages.map((m) => m.role);
            if (!roles.includes("system") || !roles.includes("user") || !roles.includes("assistant")) {
              errors.push(`Example ${i + idx}: missing required roles`);
              return null;
            }
            return parsed;
          } catch (e) {
            errors.push(`Example ${i + idx}: ${e instanceof Error ? e.message : "generation failed"}`);
            return null;
          }
        })
      );

      for (const r of results) {
        if (r) synthetic.push(r);
      }
    }

    const combined = [...examples, ...synthetic];
    const jsonl = combined.map((e) => JSON.stringify(e)).join("\n") + "\n";

    return NextResponse.json({
      originalCount: examples.length,
      syntheticCount: synthetic.length,
      totalCount: combined.length,
      errors: errors.slice(0, 10),
      jsonl,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
