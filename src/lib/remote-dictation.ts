import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/* ── Remote phone dictation pairing tokens ──────────────────────
   The desktop shows a QR that encodes a signed, stateless token.
   The phone presents it (header "x-remote-dictation") to the
   transcription routes as an alternative to session-cookie auth.
   The token only identifies the user + realtime channel — it grants
   no access to reports, templates, or any other account data. */

/** One work shift; the link dies sooner if the user unlinks it. */
export const REMOTE_DICTATION_TTL_MS = 8 * 60 * 60 * 1000;

export const REMOTE_DICTATION_HEADER = "x-remote-dictation";

export interface RemoteDictationSession {
  userId: string;
  channelId: string;
  exp: number;
}

function signingSecret(): Buffer {
  const base = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base) throw new Error("No signing secret available for remote dictation tokens");
  // Domain-separate from any other use of the key.
  return createHmac("sha256", base).update("radiogenia-remote-dictation-v1").digest();
}

function sign(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function createRemoteDictationToken(
  userId: string,
  ttlMs: number = REMOTE_DICTATION_TTL_MS,
): { token: string; channelId: string; exp: number } {
  const channelId = randomBytes(16).toString("hex");
  const exp = Date.now() + ttlMs;
  const payload = Buffer.from(JSON.stringify({ u: userId, c: channelId, e: exp })).toString("base64url");
  return { token: `${payload}.${sign(payload)}`, channelId, exp };
}

export function verifyRemoteDictationToken(token: string | null | undefined): RemoteDictationSession | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let expected: Buffer;
  try {
    expected = Buffer.from(sign(payload), "base64url");
  } catch {
    return null;
  }
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { u?: string; c?: string; e?: number };
    if (!data.u || !data.c || typeof data.e !== "number") return null;
    if (Date.now() > data.e) return null;
    return { userId: data.u, channelId: data.c, exp: data.e };
  } catch {
    return null;
  }
}
