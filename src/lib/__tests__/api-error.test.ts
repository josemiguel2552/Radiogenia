import { describe, it, expect } from "vitest";
import { getErrorMessage, getErrorStatus, toErrorResponse, dbErrorResponse } from "@/lib/api-error";

describe("getErrorMessage", () => {
  it("extracts message from Error instances", () => {
    expect(getErrorMessage(new Error("test"))).toBe("test");
  });

  it("returns Unknown error for non-Error values", () => {
    expect(getErrorMessage("string")).toBe("Unknown error");
    expect(getErrorMessage(null)).toBe("Unknown error");
    expect(getErrorMessage(42)).toBe("Unknown error");
  });
});

describe("getErrorStatus", () => {
  it("returns 401 for Unauthorized", () => {
    expect(getErrorStatus("Unauthorized")).toBe(401);
  });

  it("returns 403 for Forbidden", () => {
    expect(getErrorStatus("Forbidden")).toBe(403);
  });

  it("returns 500 for unknown messages", () => {
    expect(getErrorStatus("something else")).toBe(500);
  });
});

describe("toErrorResponse", () => {
  it("sanitizes unknown error messages", async () => {
    const res = toErrorResponse(new Error("relation \"users\" does not exist"));
    const body = await res.json();
    expect(body.error).toBe("Internal server error");
    expect(res.status).toBe(500);
  });

  it("preserves known client-safe messages", async () => {
    const res = toErrorResponse(new Error("Unauthorized"));
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(res.status).toBe(401);
  });

  it("preserves Forbidden with 403 status", async () => {
    const res = toErrorResponse(new Error("Forbidden"));
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
    expect(res.status).toBe(403);
  });

  it("uses fallback status when provided", async () => {
    const res = toErrorResponse(new Error("Forbidden"), 403);
    expect(res.status).toBe(403);
  });
});

describe("dbErrorResponse", () => {
  it("sanitizes database errors", async () => {
    const res = dbErrorResponse({ message: "column \"foo\" of relation \"bar\" does not exist" });
    const body = await res.json();
    expect(body.error).toBe("Database operation failed");
    expect(res.status).toBe(500);
  });

  it("preserves duplicate key errors", async () => {
    const res = dbErrorResponse({ message: "duplicate key value violates unique constraint" });
    const body = await res.json();
    expect(body.error).toContain("duplicate key");
  });

  it("preserves already exists messages", async () => {
    const res = dbErrorResponse({ message: "User already exists" });
    const body = await res.json();
    expect(body.error).toContain("already exists");
  });
});
