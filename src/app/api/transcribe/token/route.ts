export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkDictationLimit } from "@/lib/auth-helpers";

let keyValidated = false;

async function validateDeepgramKey(key: string): Promise<boolean> {
  if (keyValidated) return true;
  try {
    const res = await fetch("https://api.deepgram.com/v1/projects", {
      headers: { Authorization: `Token ${key}` },
    });
    keyValidated = res.ok;
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dgKey = process.env.DEEPGRAM_API_KEY;
    if (!dgKey) {
      return NextResponse.json({ error: "Deepgram API key not configured" }, { status: 500 });
    }

    const valid = await validateDeepgramKey(dgKey);
    if (!valid) {
      return NextResponse.json({ error: "Clave de Deepgram inválida. Revisa DEEPGRAM_API_KEY." }, { status: 500 });
    }

    const quota = await checkDictationLimit(user.id);
    if (!quota.allowed) {
      return NextResponse.json({
        error: "Dictation limit reached",
        code: "DICTATION_LIMIT",
      }, { status: 429 });
    }

    return NextResponse.json({
      key: dgKey,
      quota: {
        usedSeconds: quota.usedSeconds,
        limitSeconds: quota.limitSeconds,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
