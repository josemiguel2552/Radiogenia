import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getGlobalAIConfig } from "@/lib/auth-helpers";

const PLATFORM_LIMITS: Record<string, number> = {
  linkedin: 3000,
  facebook: 2000,
  instagram: 2200,
  x: 280,
};

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { type, platform, tone, language, customPrompt } = await req.json();

    if (!type || !platform) {
      return NextResponse.json({ error: "type and platform required" }, { status: 400 });
    }

    const config = await getGlobalAIConfig();
    const apiKey = config.apiKey;
    const charLimit = PLATFORM_LIMITS[platform] || 2000;
    const lang = language || "es";

    const langLabel = lang === "es" ? "español" : lang === "pt" ? "portugués" : "inglés";
    const toneLabel = tone || "profesional pero cercano";

    const systemPrompt = `Eres un experto en marketing digital para SaaS de salud/radiología. Generas contenido para redes sociales.

PRODUCTO: Radiogen.AI — asistente de redacción de informes radiológicos con IA. El radiólogo dicta los hallazgos y la IA genera el informe estructurado con conclusiones. No es diagnóstico, es redacción asistida.

CARACTERÍSTICAS CLAVE:
- Dictado por voz con IA (Whisper)
- Informes estructurados por modalidad (TC, RM, Rx, Eco, PET, Mamografía)
- Templates personalizables por anatomía
- Conclusiones automáticas
- Aprendizaje del estilo de redacción del radiólogo
- Multilingüe (ES/EN/PT)
- Planes desde gratis hasta profesional

REGLAS:
1. Escribe en ${langLabel}
2. Tono: ${toneLabel}
3. Máximo ${charLimit} caracteres
4. NO uses hashtags excesivos (máx 3-5 relevantes)
5. Incluye un call-to-action cuando sea apropiado
6. NO hagas claims médicos ni de diagnóstico
7. Adapta el formato a ${platform} (${platform === "x" ? "breve y directo" : platform === "linkedin" ? "profesional con párrafos cortos" : platform === "instagram" ? "visual, emojis moderados" : "conversacional"})`;

    const typePrompts: Record<string, string> = {
      testimonial: "Genera un post tipo testimonial/caso de uso. Cuenta cómo un radiólogo usa Radiogen.AI en su día a día y cómo le ahorra tiempo. Hazlo creíble y específico.",
      tip: "Genera un post con un tip o consejo útil sobre productividad en radiología, incluyendo cómo Radiogen.AI ayuda. Aporta valor real antes de mencionar el producto.",
      promo: "Genera un post promocional sobre Radiogen.AI. Destaca los beneficios principales y el plan gratuito. Incluye call-to-action para probar la plataforma.",
      educational: "Genera un post educativo sobre radiología o tecnología IA en medicina. Posiciona a Radiogen.AI como referente sin ser demasiado comercial.",
      announcement: "Genera un post de anuncio/novedad sobre Radiogen.AI. Puede ser sobre una nueva funcionalidad, expansión a nuevos mercados, o hito de la empresa.",
    };

    const userPrompt = customPrompt
      ? customPrompt
      : typePrompts[type] || typePrompts.promo;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1000,
        temperature: 0.8,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.error?.message || "AI generation failed" }, { status: 500 });
    }

    const data = await res.json();
    const post = data.choices?.[0]?.message?.content?.trim() || "";

    return NextResponse.json({ post, platform, type, characters: post.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
