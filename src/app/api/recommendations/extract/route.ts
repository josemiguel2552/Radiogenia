export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig, resolveApiKey, hasPlatformAccess, requireRegionFeature } from "@/lib/auth-helpers";
import { generateAIWithUsage } from "@/lib/ai-provider";
import { logAICost } from "@/lib/log-ai-cost";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { toErrorResponse } from "@/lib/api-error";

type Lang = "es" | "en" | "pt";

function buildPrompt(lang: Lang): string {
  const instructions: Record<Lang, string> = {
    es: `Eres un asistente que EXTRAE recomendaciones de seguimiento/manejo radiológico a partir del texto de una guía clínica.

Devuelve ÚNICAMENTE un array JSON. Cada elemento: {"title": "...", "text": "..."}.
- "title": el hallazgo o situación que dispara la recomendación (frase corta). Ej: "Nódulo sólido 6-8 mm, bajo riesgo".
- "text": la recomendación concreta lista para insertar en un informe. Ej: "TC de control en 6-12 meses; considerar seguimiento adicional a 18-24 meses.".
REGLAS:
- Solo recomendaciones ACCIONABLES que un radiólogo insertaría en un informe (seguimiento, control, siguiente prueba, umbrales de manejo).
- Mantén el texto conciso y fiel a la guía. No inventes.
- Mismo idioma que la guía.
- NO añadas comentarios, explicaciones ni markdown. SOLO el array JSON.
- Si no hay recomendaciones extraíbles, devuelve [].`,
    en: `You EXTRACT radiology follow-up/management recommendations from clinical-guideline text.

Return ONLY a JSON array. Each item: {"title": "...", "text": "..."}.
- "title": the finding or situation that triggers the recommendation (short phrase). E.g. "Solid nodule 6-8 mm, low risk".
- "text": the concrete recommendation, ready to insert in a report. E.g. "Follow-up CT at 6-12 months; consider additional follow-up at 18-24 months.".
RULES:
- Only ACTIONABLE recommendations a radiologist would insert in a report (follow-up, surveillance, next test, management thresholds).
- Keep text concise and faithful to the guideline. Do not invent.
- Same language as the guideline.
- NO commentary, explanations or markdown. ONLY the JSON array.
- If there are no extractable recommendations, return [].`,
    pt: `Você EXTRAI recomendações de seguimento/conduta radiológica a partir do texto de uma diretriz clínica.

Retorne APENAS um array JSON. Cada item: {"title": "...", "text": "..."}.
- "title": o achado ou situação que dispara a recomendação (frase curta). Ex: "Nódulo sólido 6-8 mm, baixo risco".
- "text": a recomendação concreta, pronta para inserir num laudo. Ex: "TC de controle em 6-12 meses; considerar seguimento adicional em 18-24 meses.".
REGRAS:
- Apenas recomendações ACIONÁVEIS que um radiologista inseriria num laudo (seguimento, controle, próximo exame, limiares de conduta).
- Mantenha o texto conciso e fiel à diretriz. Não invente.
- Mesmo idioma da diretriz.
- SEM comentários, explicações ou markdown. APENAS o array JSON.
- Se não houver recomendações extraíveis, retorne [].`,
  };
  return instructions[lang];
}

function parseItems(raw: string): { title: string; text: string }[] {
  let s = raw.trim();
  // Strip markdown fences if present.
  s = s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  // Grab the outermost array if there's surrounding prose.
  const start = s.indexOf("[");
  const end = s.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) s = s.slice(start, end + 1);
  let arr: unknown;
  try { arr = JSON.parse(s); } catch { return []; }
  if (!Array.isArray(arr)) return [];
  const out: { title: string; text: string }[] = [];
  for (const it of arr) {
    if (it && typeof it === "object") {
      const title = String((it as Record<string, unknown>).title || "").trim();
      const text = String((it as Record<string, unknown>).text || "").trim();
      if (title && text) out.push({ title: title.slice(0, 200), text: text.slice(0, 1200) });
    }
    if (out.length >= 60) break;
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = rateLimit(`rec-extract:${user.id}`, RATE_LIMITS.generate);
    if (!rl.allowed) return rl.errorResponse!;

    // Card-first billing: no AI usage without an active subscription, even
    // via direct API calls with a live session.
    if (!(await hasPlatformAccess(user.id))) {
      return NextResponse.json({ error: "Subscription required", code: "SUBSCRIPTION_REQUIRED" }, { status: 403 });
    }

    // Interpretive features are clinical decision support and are not offered
    // where that would qualify the product as a regulated medical device.
    const regionBlock = await requireRegionFeature(user.id, "recommendations", req.headers.get("x-vercel-ip-country"));
    if (regionBlock) return regionBlock;


    const { text, language } = await req.json() as { text?: string; language?: string };
    if (!text || text.trim().length < 40) {
      return NextResponse.json({ error: "Not enough text" }, { status: 400 });
    }

    const lang = (language === "en" || language === "pt" ? language : "es") as Lang;
    const globalConfig = await getGlobalAIConfig();
    const taskModel = globalConfig.taskOverrides?.classify;
    const provider = taskModel?.provider || globalConfig.provider;
    const apiKey = resolveApiKey(globalConfig, provider);
    if (!apiKey) {
      return NextResponse.json({ error: `No API key configured for provider "${provider}".` }, { status: 500 });
    }
    const model = taskModel?.modelName || globalConfig.modelName;

    const { text: out, usage } = await generateAIWithUsage({
      provider,
      modelName: model,
      apiKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system: buildPrompt(lang),
      user: text.slice(0, 24000),
      maxTokens: 4000,
    });

    if (usage) {
      logAICost({
        userId: user.id,
        action: "extract_recommendations",
        provider,
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      });
    }

    return NextResponse.json({ recommendations: parseItems(out) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
