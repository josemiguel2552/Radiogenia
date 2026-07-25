export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkDictationLimit } from "@/lib/auth-helpers";
import { verifyRemoteDictationToken, REMOTE_DICTATION_HEADER } from "@/lib/remote-dictation";
import { toErrorResponse } from "@/lib/api-error";

const TEMP_KEY_TTL = 120;

async function createTemporaryKey(apiKey: string): Promise<string> {
  const projectRes = await fetch("https://api.deepgram.com/v1/projects", {
    headers: { Authorization: `Token ${apiKey}` },
  });
  if (!projectRes.ok) throw new Error("Failed to fetch Deepgram projects");
  const { projects } = await projectRes.json();
  if (!projects?.length) throw new Error("No Deepgram projects found");
  const projectId = projects[0].project_id;

  const keyRes = await fetch(`https://api.deepgram.com/v1/projects/${projectId}/keys`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      comment: `radiogenia-temp-${Date.now()}`,
      scopes: ["usage:write"],
      time_to_live_in_seconds: TEMP_KEY_TTL,
    }),
  });
  if (!keyRes.ok) throw new Error("Failed to create temporary Deepgram key");
  const { key } = await keyRes.json();
  return key;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id
      || verifyRemoteDictationToken(req.headers.get(REMOTE_DICTATION_HEADER))?.userId;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dgKey = process.env.DEEPGRAM_API_KEY;
    if (!dgKey) {
      return NextResponse.json({ error: "Deepgram API key not configured" }, { status: 500 });
    }

    const quota = await checkDictationLimit(userId);
    if (!quota.allowed) {
      return NextResponse.json({
        error: "Dictation limit reached",
        code: "DICTATION_LIMIT",
      }, { status: 429 });
    }

    let tempKey: string;
    try {
      tempKey = await createTemporaryKey(dgKey);
    } catch {
      tempKey = dgKey;
    }

    return NextResponse.json({
      key: tempKey,
      quota: {
        usedSeconds: quota.usedSeconds,
        limitSeconds: quota.limitSeconds,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
