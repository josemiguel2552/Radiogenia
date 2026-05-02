export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig, resolveApiKey, type GlobalAIConfig } from "@/lib/auth-helpers";
import { checkDocumentLimit } from "@/lib/auth-helpers";
import { generateAI } from "@/lib/ai-provider";
import mammoth from "mammoth";
import { extractPdfText } from "@/lib/pdf-extract";
import type { AIProvider } from "@/lib/types";

const LIGHT_MODELS: Record<AIProvider, string> = {
  claude: "claude-haiku-4-5-20251001",
  openai: "gpt-4o-mini",
  deepseek: "deepseek-chat",
  gemini: "gemini-2.0-flash",
  custom: "",
};

const CHUNK_SIZE = 12_000;

const SYSTEM_PROMPT = `Extract clinical recommendations from the text below. Return ONLY a valid JSON array.
Each object must have:
- "trigger": the finding/condition (short, e.g. "Pulmonary nodule >8mm")
- "recommendation": the recommended action (short)
- "guideline": the guideline name/source
If no recommendations are found, return [].`;

function pickLightModel(config: GlobalAIConfig): { provider: AIProvider; modelName: string; apiKey: string } {
  const recsOverride = config.taskOverrides?.recommendations;
  if (recsOverride) {
    return {
      provider: recsOverride.provider,
      modelName: recsOverride.modelName,
      apiKey: resolveApiKey(config, recsOverride.provider),
    };
  }

  const provider = config.provider;
  const lightModel = LIGHT_MODELS[provider] || config.modelName;

  return { provider, modelName: lightModel, apiKey: config.apiKey };
}

function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

interface Recommendation {
  trigger: string;
  recommendation: string;
  guideline: string;
  keywords?: string;
  supported_report_types?: string;
}

function deduplicateRecs(recs: Recommendation[]): Recommendation[] {
  const seen = new Set<string>();
  return recs.filter((r) => {
    const key = `${r.trigger.toLowerCase().trim()}|${r.recommendation.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const docLimit = await checkDocumentLimit(user.id);
    if (!docLimit.allowed) {
      return NextResponse.json({
        error: `Document limit reached (${docLimit.used}/${docLimit.limit}). Upgrade your plan to upload more guideline documents.`,
      }, { status: 429 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (msg.includes("size") || msg.includes("too large") || msg.includes("limit")) {
        return NextResponse.json({ error: "File too large. Try a smaller document." }, { status: 413 });
      }
      return NextResponse.json({ error: "Could not read uploaded file: " + msg }, { status: 400 });
    }
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    let docText = "";
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });
      docText = result.value;
    } else if (fileName.endsWith(".pdf")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      docText = await extractPdfText(buffer);
    } else {
      return NextResponse.json({ error: "Unsupported file type. Use .docx or .pdf" }, { status: 400 });
    }

    if (!docText.trim()) {
      return NextResponse.json({ error: "Document is empty or could not be read" }, { status: 400 });
    }

    const globalConfig = await getGlobalAIConfig();
    const { provider, modelName, apiKey } = pickLightModel(globalConfig);

    const chunks = splitIntoChunks(docText, CHUNK_SIZE);
    const allRecs: Recommendation[] = [];

    for (const chunk of chunks) {
      try {
        const text = await generateAI({
          provider,
          modelName,
          apiKey,
          customBaseUrl: globalConfig.customBaseUrl,
          system: SYSTEM_PROMPT,
          user: chunk,
          maxTokens: 4096,
        });

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            allRecs.push(...parsed.filter((r: Recommendation) => r.trigger && r.recommendation));
          }
        }
      } catch (e) {
        console.error("Chunk extraction error:", e instanceof Error ? e.message : e);
      }
    }

    if (allRecs.length === 0) {
      return NextResponse.json({
        error: "No recommendations could be extracted from this document. Try a document with structured clinical guidelines.",
      }, { status: 400 });
    }

    const recommendations = deduplicateRecs(allRecs);
    return NextResponse.json({ recommendations });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Recommendations upload error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
