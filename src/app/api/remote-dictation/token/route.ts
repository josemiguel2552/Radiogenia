export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRemoteDictationToken } from "@/lib/remote-dictation";
import { isDictationEnabledForUser } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";

/** Desktop requests a pairing token to show as a QR code. */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // The paired phone transcribes through /api/transcribe/token, which checks
    // this too — but refusing the pairing itself means the QR code is never
    // offered to a hospital that has dictation switched off.
    if (!(await isDictationEnabledForUser(user.id))) {
      return NextResponse.json(
        { error: "Voice dictation is not enabled for your hospital", code: "DICTATION_DISABLED" },
        { status: 403 },
      );
    }

    const { token, channelId, exp } = createRemoteDictationToken(user.id);
    return NextResponse.json({ token, channelId, exp });
  } catch (error) {
    return toErrorResponse(error);
  }
}
