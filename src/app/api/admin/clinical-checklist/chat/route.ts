export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { getGlobalAIConfig, resolveApiKey } from "@/lib/auth-helpers";
import { generateAIWithUsage } from "@/lib/ai-provider";
import { logAICost } from "@/lib/log-ai-cost";
import { toErrorResponse } from "@/lib/api-error";
import { type ChecklistSection } from "@/lib/clinical-checklist-kb";

const SYSTEM_PROMPT = `You are an assistant that manages a clinical checklist for radiology reports. The checklist is a JSON array of anatomical sections, each containing clinical conditions, each containing associated findings that radiologists commonly forget to mention.

Current data structure:
- sections[]: { id, name, conditions[] }
- conditions[]: { id, name, findings[] }
- findings[]: string (description of the finding)

The user (admin) will give you instructions in natural language. You must:
1. Understand what they want (add/remove/modify sections, conditions, or findings)
2. Apply the changes to the current JSON data
3. Return ONLY a valid JSON object with this exact format (no markdown, no code blocks, no explanations):
{"sections": [...the updated sections array...], "summary": "Brief description of what was changed"}

RULES:
- Always preserve the existing data unless explicitly asked to remove something
- Generate a short lowercase id for new items (e.g., "liver-abscess", "renal-trauma")
- Names should be bilingual (Spanish / English) like the existing ones
- Findings should be in Spanish (matching the existing style) — concise, clinical, professional
- If the user asks something unclear, still return valid JSON with the unchanged data and put a question in the summary
- NEVER return anything other than the JSON object`;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAdmin();

    const { message, sections } = (await req.json()) as {
      message: string;
      sections: ChecklistSection[];
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: "No message" }, { status: 400 });
    }

    const globalConfig = await getGlobalAIConfig();
    const taskModel = globalConfig.taskOverrides?.chatbot;
    const effectiveProvider = taskModel?.provider || globalConfig.provider;
    const effectiveKey = resolveApiKey(globalConfig, effectiveProvider);

    if (!effectiveKey) {
      return NextResponse.json(
        { error: `No API key for "${effectiveProvider}".` },
        { status: 500 },
      );
    }

    const effectiveModel = taskModel?.modelName || globalConfig.modelName;

    const { text, usage } = await generateAIWithUsage({
      provider: effectiveProvider,
      modelName: effectiveModel,
      apiKey: effectiveKey,
      customBaseUrl: globalConfig.customBaseUrl,
      system: SYSTEM_PROMPT,
      user: `Current checklist data:\n${JSON.stringify(sections, null, 2)}\n\nUser instruction: ${message}`,
      maxTokens: 4096,
    });

    if (usage) {
      logAICost({
        userId,
        action: "checklist_chat",
        provider: effectiveProvider,
        model: effectiveModel,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      });
    }

    const raw = text.trim().replace(/^```json?\s*/, "").replace(/\s*```$/, "");
    try {
      const result = JSON.parse(raw) as {
        sections: ChecklistSection[];
        summary: string;
      };
      if (Array.isArray(result.sections)) {
        return NextResponse.json({
          sections: result.sections,
          summary: result.summary || "Changes applied",
        });
      }
    } catch {
      // AI response wasn't valid JSON
    }

    return NextResponse.json(
      { error: "Failed to parse AI response", sections, summary: "No changes made" },
      { status: 200 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
