import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { generateAI } from "@/lib/ai-provider";
import { toErrorResponse } from "@/lib/api-error";
import type { AIProvider } from "@/lib/types";
import { createServiceClient } from "@/lib/supabase/service";
import { buildTrainingExamples, toJsonl } from "@/lib/training-export";
import { adaptJsonl, finetuneSpec } from "@/lib/finetune-providers";
import { uploadJsonlToProvider } from "@/lib/finetune-upload";

export const dynamic = "force-dynamic";
/** Each synthetic example is an AI call, so this is the long one. */
export const maxDuration = 300;

/**
 * How many real examples get a synthetic twin in one run.
 *
 * Every one is a model call. 841 examples cannot be augmented inside a single
 * request however the batching is arranged, so the cap is explicit and the
 * response says how many were covered — run it again for more, rather than
 * pressing a button that always times out.
 */
const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 200;
/** Concurrent calls. Was 3, which made 841 examples 281 sequential rounds. */
const CONCURRENCY = 8;

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

    const body = await req.json().catch(() => ({})) as {
      examples?: TrainingExample[];
      provider?: string;
      modality?: string;
      correctionsOnly?: boolean;
      limit?: number;
    };

    // Built here rather than posted in: the file is ~9.5 KB an example, so a
    // real dataset does not fit through a 4.5 MB request body — that upload
    // answered 413, and the browser could not parse the plain-text body.
    const spec = finetuneSpec(String(body.provider || "openai"));
    const source: TrainingExample[] = body.examples?.length
      ? body.examples
      : (await buildTrainingExamples(createServiceClient(), {
          modality: body.modality || null,
          correctionsOnly: !!body.correctionsOnly,
        })).examples;

    if (source.length === 0) {
      return NextResponse.json({ error: "No examples to augment" }, { status: 400 });
    }

    const limit = Math.min(Math.max(Number(body.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const examples = source.slice(0, limit);

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
    const batchSize = CONCURRENCY;

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

    // The whole set plus the twins we just made, not only the slice that was
    // augmented: the point is to train on everything, with some of it doubled.
    const combined = [...source, ...synthetic];
    const jsonl = toJsonl(combined);

    // Uploaded from here. Handing a multi-megabyte file back so the browser
    // can post it somewhere is the round trip that was failing.
    const adapted = adaptJsonl(jsonl, spec);
    const uploadKey = resolveApiKey(globalConfig, spec.keyProvider);
    let fileId: string | null = null;
    let uploadError: string | null = null;
    if (!uploadKey) {
      uploadError = `No ${spec.label} API key configured.`;
    } else if (!adapted.acceptable) {
      uploadError = `${spec.label} needs at least ${spec.minExamples} examples; this set has ${adapted.kept}.`;
    } else {
      const up = await uploadJsonlToProvider(spec, uploadKey, adapted.jsonl, "training_data_augmented.jsonl");
      if (up.error) uploadError = up.error; else fileId = up.fileId || null;
    }

    return NextResponse.json({
      provider: spec.id,
      originalCount: source.length,
      augmentedOf: examples.length,
      syntheticCount: synthetic.length,
      totalCount: combined.length,
      remaining: Math.max(0, source.length - examples.length),
      errors: errors.slice(0, 10),
      fileId,
      uploadError,
      bytes: Buffer.byteLength(adapted.jsonl, "utf8"),
      // A look at what it made, instead of several megabytes of file.
      preview: synthetic.slice(0, 2),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
