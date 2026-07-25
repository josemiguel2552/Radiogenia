export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRemoteDictationToken } from "@/lib/remote-dictation";
import { toErrorResponse } from "@/lib/api-error";

/** Desktop requests a pairing token to show as a QR code. */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { token, channelId, exp } = createRemoteDictationToken(user.id);
    return NextResponse.json({ token, channelId, exp });
  } catch (error) {
    return toErrorResponse(error);
  }
}
