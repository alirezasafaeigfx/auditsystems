import crypto from "node:crypto";
import { NextRequest } from "next/server";

const IP_HASH_SALT = process.env.IP_HASH_SALT;

function requireSalt(): string {
  if (!IP_HASH_SALT) {
    throw new Error("IP_HASH_SALT environment variable is required but not set");
  }
  return IP_HASH_SALT;
}

export function getClientIp(request: NextRequest): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const first = xForwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function hashClientIp(ip: string): string {
  const salt = requireSalt();
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function sanitizeApiError(error: unknown): { status: number; code: string } {
  if (!(error instanceof Error)) {
    return { status: 500, code: "INTERNAL_ERROR" };
  }

  if (isDnsLookupFailure(error)) {
    return { status: 503, code: "DNS_LOOKUP_FAILED" };
  }

  if (error.message.startsWith("INVALID_URL_") || error.message.startsWith("SSRF_BLOCKED_") || error.message.startsWith("INVALID_HOSTNAME_")) {
    return { status: 400, code: error.message };
  }

  return { status: 500, code: "INTERNAL_ERROR" };
}

export function isDnsLookupFailure(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = (error as { code?: string }).code;
  if (typeof code === "string") {
    const normalized = code.toUpperCase();
    return ["ENOTFOUND", "EAI_AGAIN", "ENODATA", "ETIMEOUT", "ETIMEDOUT", "EAI_NODATA"].includes(normalized);
  }

  const message = error.message.toLowerCase();
  return message.includes("getaddrinfo") || message.includes("query timed out");
}
