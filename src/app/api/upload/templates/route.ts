export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig, checkDocumentLimit } from "@/lib/auth-helpers";
import { generateAI } from "@/lib/ai-provider";
import mammoth from "mammoth";
import { extractPdfText } from "@/lib/pdf-extract";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const docLimit = await checkDocumentLimit(user.id);
    if (!docLimit.allowed) {
      return NextResponse.json({
        error: `Document limit reached (${docLimit.used}/${docLimit.limit}). Upgrade your plan to upload more documents.`,
      }, { status: 429 });
    }

    const formData = await req.formData();
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
      return NextResponse.json({ error: "Document is empty" }, { status: 400 });
    }

    const globalConfig = await getGlobalAIConfig();

    const system = `You are a radiology informatics expert. Given a document containing radiology report templates, extract each template and classify it.

For each template found, return a JSON object with:
- "title": the name of the template (e.g. "Brain MRI", "Chest CT scan")
- "technique": the imaging modality, MUST be one of: CT, MRI, Ultrasound, XRay, Mammography, Procedures
- "section": the anatomical section, MUST be one of: Head and neck, Thorax, Abdomen and pelvis, Spine, Upper limbs, Lower limbs
- "template": the template text with section headers formatted as **Section Name**: {section_name_placeholder}. Use ****FINDINGS**** at the start and ****CONCLUSION**** before the conclusion section.

Return ONLY valid JSON array. Example:
[
  {
    "title": "Brain MRI",
    "technique": "MRI",
    "section": "Head and neck",
    "template": "****FINDINGS****\\n**Supratentorial brain parenchyma**: {supratentorial brain parenchyma}\\n**Infratentorial brain parenchyma**: {infratentorial brain parenchyma}\\n****CONCLUSION****\\n{conclusion}"
  }
]

If the document contains a single template, still return it as an array with one element.`;

    const text = await generateAI({
      provider: globalConfig.provider,
      modelName: globalConfig.modelName,
      apiKey: globalConfig.apiKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system,
      user: `Extract and classify all radiology report templates from this document:\n\n${docText.substring(0, 20000)}`,
    });

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });

    const templates = JSON.parse(jsonMatch[0]);

    const validTechniques = ["CT", "MRI", "Ultrasound", "XRay", "Mammography", "Procedures"];
    const validSections = ["Head and neck", "Thorax", "Abdomen and pelvis", "Spine", "Upper limbs", "Lower limbs"];

    const normalized = templates.map((t: { title: string; technique: string; section: string; template: string }, idx: number) => ({
      title: t.title || `Template ${idx + 1}`,
      technique: validTechniques.includes(t.technique) ? t.technique : "CT",
      section: validSections.includes(t.section) ? t.section : "Head and neck",
      template: t.template || "",
    }));

    return NextResponse.json({ templates: normalized });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
