export const maxDuration = 120;
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getGlobalAIConfig, requireOrgRole } from "@/lib/auth-helpers";
import { generateAIWithUsage } from "@/lib/ai-provider";
import { logAICost } from "@/lib/log-ai-cost";
import mammoth from "mammoth";
import { extractPdfText } from "@/lib/pdf-extract";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

const SYSTEM_PROMPT = `You are a radiology informatics expert. Given a document containing radiology report templates, extract each template and classify it.

For each template found, return a JSON object with:
- "title": the name of the template (e.g. "Brain MRI", "Chest CT scan")
- "technique": the imaging modality, MUST be one of: CT, MRI, Ultrasound, XRay, Mammography, RECIST, Procedures
- "template": the template text with section headers formatted as **Section Name**: {section_name_placeholder}. Use ****FINDINGS**** at the start and ****CONCLUSION**** before the conclusion section.

Return ONLY valid JSON array. If a single template, return array with one element.`;

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
      return NextResponse.json({ error: "Unsupported format. Use .docx or .pdf" }, { status: 400 });
    }

    if (!docText.trim()) {
      return NextResponse.json({ error: "Document is empty or could not be read" }, { status: 400 });
    }

    const globalConfig = await getGlobalAIConfig();

    const aiResult = await generateAIWithUsage({
      provider: globalConfig.provider,
      modelName: globalConfig.modelName,
      apiKey: globalConfig.apiKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system: SYSTEM_PROMPT,
      user: `Extract and classify all radiology report templates from this document:\n\n${docText.substring(0, 20000)}`,
    });

    logAICost({ userId: user.id, action: "extract_templates", provider: globalConfig.provider, model: globalConfig.modelName, inputTokens: aiResult.usage.inputTokens, outputTokens: aiResult.usage.outputTokens }).catch(() => {});

    const text = aiResult.text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ error: "Could not extract templates from document" }, { status: 400 });

    const parsed = JSON.parse(jsonMatch[0]);
    const validTechniques = ["CT", "MRI", "Ultrasound", "XRay", "Mammography", "RECIST", "Procedures"];

    interface ExtractedTemplate { title: string; technique: string; template: string }
    const templates = (parsed as ExtractedTemplate[]).map((t, idx) => ({
      title: t.title || `Plantilla ${idx + 1}`,
      technique: validTechniques.includes(t.technique) ? t.technique : "CT",
      template: t.template || "",
    }));

    const service = createServiceClient();
    let saved = 0;

    for (const t of templates) {
      const structure = { id: Date.now() + saved, title: t.title, technique: t.technique, template: t.template, section: "" };
      const { error } = await service.from("org_templates").insert({
        org_id: membership.org_id,
        section_id: sectionId,
        name: t.title,
        modality: t.technique,
        structure,
        created_by: user.id,
        updated_by: user.id,
      });
      if (!error) saved++;
    }

    return NextResponse.json({ extracted: templates.length, saved });
  } catch (error) {
    return toErrorResponse(error);
  }
}
