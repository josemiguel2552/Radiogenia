import { NextResponse } from "next/server";

const KNOWN_CLIENT_MESSAGES = new Set([
  "Unauthorized",
  "Forbidden",
  "Missing name or slug",
  "Missing organization id",
  "userId required",
  "email and password required",
  "Password must be at least 6 characters",
  "No valid fields to update",
  "Missing id",
]);

function isClientSafe(message: string): boolean {
  if (KNOWN_CLIENT_MESSAGES.has(message)) return true;
  if (message.startsWith("duplicate key") || message.includes("already exists")) return true;
  if (message.includes("violates unique constraint")) return true;
  return false;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function getErrorStatus(message: string): number {
  if (message === "Unauthorized") return 401;
  if (message === "Forbidden") return 403;
  return 500;
}

export function toErrorResponse(error: unknown, fallbackStatus = 500) {
  const message = getErrorMessage(error);
  const status = fallbackStatus !== 500 ? fallbackStatus : getErrorStatus(message);
  const safe = isClientSafe(message) ? message : "Internal server error";
  return NextResponse.json({ error: safe }, { status });
}

export function dbErrorResponse(error: { message: string }, status = 500) {
  const safe = isClientSafe(error.message) ? error.message : "Database operation failed";
  return NextResponse.json({ error: safe }, { status });
}
