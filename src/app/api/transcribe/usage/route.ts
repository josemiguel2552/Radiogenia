export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { incrementDictationUsage, checkDictationLimit } from "@/lib/auth-helpers";
import { verifyRemoteDictationToken, REMOTE_DICTATION_HEADER } from "@/lib/remote-dictation";
import { logAudioCost } from "@/lib/log-ai-cost";
import { toErrorResponse } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id
      || verifyRemoteDictationToken(req.headers.get(REMOTE_DICTATION_HEADER))?.userId;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { seconds } = await req.json();
    const rounded = Math.max(1, Math.ceil(Number(seconds) || 0));

    const quota = await checkDictationLimit(userId);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: "Dictation limit reached", dictation: { usedSeconds: quota.usedSeconds, limitSeconds: quota.limitSeconds } },
        { status: 429 },
      );
    }

    const newUsed = await incrementDictationUsage(userId, rounded);

    logAudioCost({ userId, action: "deepgram_transcription", provider: "deepgram", model: "deepgram-nova-2", durationSeconds: rounded }).catch(() => {});

    return NextResponse.json({
      dictation: {
        usedSeconds: newUsed,
        limitSeconds: quota.limitSeconds,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
