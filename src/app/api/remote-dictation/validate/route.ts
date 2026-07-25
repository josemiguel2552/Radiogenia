export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifyRemoteDictationToken } from "@/lib/remote-dictation";
import { toErrorResponse } from "@/lib/api-error";

/** Phone validates the scanned token and learns its realtime channel. */
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    const session = verifyRemoteDictationToken(typeof token === "string" ? token : null);
    if (!session) return NextResponse.json({ ok: false }, { status: 401 });
    return NextResponse.json({ ok: true, channelId: session.channelId, exp: session.exp });
  } catch (error) {
    return toErrorResponse(error);
  }
}
