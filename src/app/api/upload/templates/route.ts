import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";
import { generateAI } from "@/lib/ai-provider";
import mammoth from "mammoth";
import type { AIProvider } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Parse Word document
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.extractRawText({ buffer });
    const docText = result.value;

    if (!docText.trim()) {
      return NextResponse.json({ error: "Document is empty" }, { status: 400 });
    }

    // Get AI config
    const { data: config } = await supabase
      .from("user_model_config")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!config) return NextResponse.json({ error: "No model config found" }, { status: 400 });

    let apiKey = "";
    try {
      apiKey = config.api_key_encrypted ? decrypt(config.api_key_encrypted) : "";
    } catch {
      return NextResponse.json({ error: "Failed to decrypt API key" }, { status: 500 });
    }
    if (!apiKey) return NextResponse.json({ error: "No API key configured" }, { status: 400 });

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
      provider: config.provider as AIProvider,
      modelName: config.model_name,
      apiKey,
      customBaseUrl: config.custom_base_url,
      system,
      user: `Extract and classify all radiology report templates from this document:\n\n${docText.substring(0, 20000)}`,
    });

    // Parse JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });

    const templates = JSON.parse(jsonMatch[0]);

    // Validate and normalize
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
