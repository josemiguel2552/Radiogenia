export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getGlobalAIConfig, resolveApiKey, type GlobalAIConfig } from "@/lib/auth-helpers";
import { requireOrgRole } from "@/lib/auth-helpers";
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
    return { provider: recsOverride.provider, modelName: recsOverride.modelName, apiKey: resolveApiKey(config, recsOverride.provider) };
  }
  const provider = config.provider;
  return { provider, modelName: LIGHT_MODELS[provider] || config.modelName, apiKey: config.apiKey };
}

interface ExtractedRec { trigger: string; recommendation: string; guideline: string }

function dedup(recs: ExtractedRec[]): ExtractedRec[] {
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

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      return NextResponse.json({ error: "Could not read file: " + msg }, { status: 400 });
    }

    const file = formData.get("file") as File;
    const sectionId = formData.get("section_id") as string;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!sectionId) return NextResponse.json({ error: "No section_id provided" }, { status: 400 });

    const membership = await requireOrgRole(user.id, {
      chief: true,
      sectionRoles: ["section_chief", "section_editor"],
      sectionId,
    });

    const fileName = file.name.toLowerCase();
    let docText = "";
    if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      docText = (await mammoth.extractRawText({ buffer })).value;
    } else if (fileName.endsWith(".pdf")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      docText = await extractPdfText(buffer);
    } else {
      return NextResponse.json({ error: "Formato no soportado. Usa .docx o .pdf" }, { status: 400 });
    }

    if (!docText.trim()) {
      return NextResponse.json({ error: "El documento está vacío o no se pudo leer" }, { status: 400 });
    }

    const globalConfig = await getGlobalAIConfig();
    const { provider, modelName, apiKey } = pickLightModel(globalConfig);

    const chunks: string[] = [];
    for (let i = 0; i < docText.length; i += CHUNK_SIZE) chunks.push(docText.slice(i, i + CHUNK_SIZE));

    const allRecs: ExtractedRec[] = [];
    for (const chunk of chunks) {
      try {
        const text = await generateAI({
          provider, modelName, apiKey,
          customBaseUrl: globalConfig.customBaseUrl,
          system: SYSTEM_PROMPT,
          user: chunk,
          maxTokens: 4096,
        });
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) allRecs.push(...parsed.filter((r: ExtractedRec) => r.trigger && r.recommendation));
        }
      } catch (e) {
        console.error("Chunk error:", e instanceof Error ? e.message : e);
      }
    }

    if (allRecs.length === 0) {
      return NextResponse.json({ error: "No se encontraron recomendaciones en el documento." }, { status: 400 });
    }

    const recommendations = dedup(allRecs);
    const service = createServiceClient();
    let saved = 0;

    for (const r of recommendations) {
      const { error } = await service.from("org_recommendations").insert({
        org_id: membership.org_id,
        section_id: sectionId,
        trigger_keyword: r.trigger,
        recommendation_text: r.recommendation,
        guideline_name: r.guideline || "",
        source: "ai_extracted",
        created_by: user.id,
      });
      if (!error) saved++;
    }

    return NextResponse.json({ extracted: recommendations.length, saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
