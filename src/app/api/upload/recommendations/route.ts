import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGlobalAIConfig } from "@/lib/auth-helpers";
import { generateAI } from "@/lib/ai-provider";
import mammoth from "mammoth";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Parse Word or PDF
    let docText = "";
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });
      docText = result.value;
    } else if (fileName.endsWith(".pdf")) {
      const buffer = Buffer.from(await file.arrayBuffer());
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const pdfData = await pdfParse(buffer);
      docText = pdfData.text;
    } else {
      return NextResponse.json({ error: "Unsupported file type. Use .docx or .pdf" }, { status: 400 });
    }

    if (!docText.trim()) {
      return NextResponse.json({ error: "Document is empty" }, { status: 400 });
    }

    const globalConfig = await getGlobalAIConfig();

    const system = `You are a radiology clinical guidelines expert. Extract structured recommendations from the provided clinical guideline document.

The document may have sections with "Finding", "Recommendation", "Keywords", "Description", "Supported Report Types", etc.

For each recommendation found, return a JSON object with:
- "trigger": the finding/condition that triggers this recommendation (concise, e.g. "Nódulo pulmonar sólido >8mm")
- "recommendation": the recommended action (e.g. "TC torácico control en 3 meses")
- "guideline": the name of the guideline/source (e.g. "ACR Incidental Findings", "Fleischner Society")
- "keywords": comma-separated keywords for matching (from the document if available)
- "supported_report_types": list of report types where this recommendation applies (from the document if available)

Return ONLY valid JSON array. Example:
[
  {
    "trigger": "Lipid-Rich Adenoma (≤ 10 HU or Signal Drop)",
    "recommendation": "Benign — no follow-up",
    "guideline": "ACR Incidental Adrenal Mass",
    "keywords": "≤10 HU, lipid-rich, myelolipoma",
    "supported_report_types": "Abdomen CT scan, Thorax CT scan"
  }
]`;

    const text = await generateAI({
      provider: globalConfig.provider,
      modelName: globalConfig.modelName,
      apiKey: globalConfig.apiKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system,
      user: `Extract all recommendations from this clinical guideline document:\n\n${docText.substring(0, 20000)}`,
    });

    // Parse JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });

    const recommendations = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ recommendations });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
