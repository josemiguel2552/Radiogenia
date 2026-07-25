import { describe, it, expect, beforeAll } from "vitest";
import { createRemoteDictationToken, verifyRemoteDictationToken } from "../remote-dictation";

beforeAll(() => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-secret-key-for-remote-dictation";
});

describe("remote dictation pairing tokens", () => {
  it("round-trips a valid token", () => {
    const { token, channelId, exp } = createRemoteDictationToken("user-123");
    const session = verifyRemoteDictationToken(token);
    expect(session).not.toBeNull();
    expect(session!.userId).toBe("user-123");
    expect(session!.channelId).toBe(channelId);
    expect(session!.exp).toBe(exp);
  });

  it("generates a unique unguessable channel per token", () => {
    const a = createRemoteDictationToken("user-123");
    const b = createRemoteDictationToken("user-123");
    expect(a.channelId).not.toBe(b.channelId);
    expect(a.channelId).toMatch(/^[0-9a-f]{32}$/);
  });

  it("rejects a tampered payload", () => {
    const { token } = createRemoteDictationToken("user-123");
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ u: "attacker", c: "x".repeat(32), e: Date.now() + 60000 })).toString("base64url");
    expect(verifyRemoteDictationToken(`${forged}.${sig}`)).toBeNull();
    // Tampered signature too
    expect(verifyRemoteDictationToken(`${payload}.AAAA${sig.slice(4)}`)).toBeNull();
  });

  it("rejects an expired token", () => {
    const { token } = createRemoteDictationToken("user-123", -1000);
    expect(verifyRemoteDictationToken(token)).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(verifyRemoteDictationToken(null)).toBeNull();
    expect(verifyRemoteDictationToken("")).toBeNull();
    expect(verifyRemoteDictationToken("no-dot-here")).toBeNull();
    expect(verifyRemoteDictationToken(".only-sig")).toBeNull();
    expect(verifyRemoteDictationToken("garbage.garbage")).toBeNull();
  });
});
