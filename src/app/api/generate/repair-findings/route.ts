import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig } from "@/lib/auth-helpers";
import { generateAIWithUsage } from "@/lib/ai-provider";
import { logAICost } from "@/lib/log-ai-cost";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { stripPii } from "@/lib/pii-detect";
import { logPiiStrip } from "@/lib/pii-log";
import { toErrorResponse } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`generate:${user.id}`, RATE_LIMITS.generate);
    if (!rl.allowed) return rl.errorResponse!;

    const body = await req.json();
    const { cleaned: findings, strippedCount, strippedTypes } = stripPii(body.findings || "");
    logPiiStrip(user.id, "repair_findings", strippedCount, strippedTypes);
    const { omissions, hallucinations, outputLanguage } = body;
    if (!findings) {
      return NextResponse.json({ error: "Missing findings" }, { status: 400 });
    }

    const hasOmissions = omissions && omissions.length > 0;
    const hasHallucinations = hallucinations && hallucinations.length > 0;
    if (!hasOmissions && !hasHallucinations) {
      return NextResponse.json({ findings });
    }

    const globalConfig = await getGlobalAIConfig();

    const lang = outputLanguage || "es";
    const langInstructions: Record<string, string> = {
      es: "Responde SOLO con el informe corregido en español. Sin explicaciones.",
      en: "Respond ONLY with the corrected report in English. No explanations.",
      pt: "Responda APENAS com o relatório corrigido em português. Sem explicações.",
    };

    let instructions = `You are a radiology report editor. Your ONLY task is to correct a structured findings report.\n\n`;
    instructions += `CURRENT FINDINGS:\n${findings}\n\n`;

    if (hasOmissions) {
      instructions += `OMITTED DICTATION FRAGMENTS (MUST be integrated into the appropriate section):\n`;
      for (const o of omissions) {
        instructions += `- "${o.dictation_fragment}" → suggested section: ${o.reason || "unknown"}\n`;
      }
      instructions += `\nRULES FOR OMISSIONS:\n`;
      instructions += `- Each omitted fragment MUST appear in the final report in the most appropriate section.\n`;
      instructions += `- If a fragment doesn't fit an existing section, append it to the closest section or add it at the end of the section list as "Additional findings" / "Hallazgos adicionales".\n`;
      instructions += `- Integrate naturally — don't just append raw text. Write it in the same style as the rest of the report.\n`;
      instructions += `- DO NOT remove or change any existing correct findings.\n\n`;
    }

    if (hasHallucinations) {
      instructions += `HALLUCINATED FINDINGS (MUST be removed — these were NOT dictated):\n`;
      for (const h of hallucinations) {
        instructions += `- In section "${h.section}": "${h.findings_fragment}"\n`;
      }
      instructions += `\nRULES FOR HALLUCINATIONS:\n`;
      instructions += `- Remove only the specific hallucinated detail, not the entire section.\n`;
      instructions += `- If removing a hallucination leaves a section empty, describe it as normal.\n`;
      instructions += `- DO NOT remove legitimate findings.\n\n`;
    }

    instructions += `OUTPUT FORMAT:\n`;
    instructions += `- Keep the exact same section structure (Section: description).\n`;
    instructions += `- Keep the same order and formatting.\n`;
    instructions += `- ${langInstructions[lang] || langInstructions.es}\n`;

    const aiResult = await generateAIWithUsage({
      provider: globalConfig.provider,
      modelName: globalConfig.modelName,
      apiKey: globalConfig.apiKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system: instructions,
      user: "Output the corrected findings report now.",
    });

    logAICost({ userId: user.id, action: "repair_findings", provider: globalConfig.provider, model: globalConfig.modelName, inputTokens: aiResult.usage.inputTokens, outputTokens: aiResult.usage.outputTokens });

    const cleaned = aiResult.text
      .replace(/^```[\s\S]*?\n/, "")
      .replace(/\n```\s*$/, "")
      .trim();

    return NextResponse.json({ findings: cleaned });
  } catch (error) {
    return toErrorResponse(error);
  }
}
