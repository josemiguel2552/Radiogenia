export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { incrementDictationUsage, checkDictationLimit } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { seconds } = await req.json();
    const rounded = Math.max(1, Math.ceil(Number(seconds) || 0));

    const newUsed = await incrementDictationUsage(user.id, rounded);
    const quota = await checkDictationLimit(user.id);

    return NextResponse.json({
      dictation: {
        usedSeconds: newUsed,
        limitSeconds: quota.limitSeconds,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
