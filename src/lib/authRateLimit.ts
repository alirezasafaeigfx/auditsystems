import crypto from "node:crypto";
import { consumeDistributedRateLimit, type RateLimitResult } from "./rateLimit";

export type AuthAbuseAction = "user-login" | "signup" | "admin-login" | "billing-checkout";

export type AuthAbuseLimitResult = {
  allowed: boolean;
  retryAfterSec: number;
  backend: RateLimitResult["backend"];
  reason?: "CLIENT_IDENTITY_UNAVAILABLE" | "BACKEND_UNAVAILABLE" | "RATE_LIMITED";
  clientHash?: string;
  subjectHash?: string;
};

type ActionConfig = {
  clientLimit: number;
  pairLimit: number;
  windowSec: number;
};

const ACTION_CONFIG: Record<AuthAbuseAction, ActionConfig> = {
  "user-login": { clientLimit: 30, pairLimit: 10, windowSec: 15 * 60 },
  signup: { clientLimit: 12, pairLimit: 4, windowSec: 60 * 60 },
  "admin-login": { clientLimit: 12, pairLimit: 8, windowSec: 15 * 60 },
  "billing-checkout": { clientLimit: 20, pairLimit: 10, windowSec: 15 * 60 },
};

const ALLOWED_PROXY_HEADERS = new Set(["x-forwarded-for", "x-real-ip"]);
const MAX_CLIENT_IDENTITY_LENGTH = 128;

function readEnv(name: string): string {
  return String(process.env[name] ?? "").trim();
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function requireHmacKey(): string {
  const salt = readEnv("IP_HASH_SALT");
  if (!salt) throw new Error("IP_HASH_SALT_MISSING");
  return salt;
}

function hmac(label: string, value: string): string {
  return crypto
    .createHmac("sha256", requireHmacKey())
    .update(`${label}\u0000${value}`)
    .digest("hex");
}

function normalizeSubject(value: string): string {
  return value.trim().toLowerCase().slice(0, 320);
}

function normalizeClientIdentity(value: string): string | null {
  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_CLIENT_IDENTITY_LENGTH) return null;
  if (/[\u0000-\u001f\u007f]/.test(normalized)) return null;
  return normalized;
}

function resolveClientIdentity(request: Request): string | null {
  const trustProxy = readEnv("AUTH_TRUST_PROXY_HEADERS").toLowerCase() === "true";
  if (!trustProxy) {
    return isProduction() ? null : "development-local-client";
  }

  const headerName = readEnv("AUTH_CLIENT_IP_HEADER").toLowerCase();
  if (!ALLOWED_PROXY_HEADERS.has(headerName)) return null;
  const raw = request.headers.get(headerName);
  if (!raw) return null;
  const candidate = headerName === "x-forwarded-for" ? raw.split(",")[0] ?? "" : raw;
  return normalizeClientIdentity(candidate);
}

function backendUnavailable(result: RateLimitResult): boolean {
  return result.backend === "disabled" || result.backend === "error";
}

function boundedRetry(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(fallback, Math.ceil(value)));
}

export async function enforceAuthAbuseLimit(input: {
  action: AuthAbuseAction;
  subject: string;
  request: Request;
}): Promise<AuthAbuseLimitResult> {
  const config = ACTION_CONFIG[input.action];
  const clientIdentity = resolveClientIdentity(input.request);
  const subject = normalizeSubject(input.subject);

  if (!clientIdentity || !subject) {
    return {
      allowed: false,
      reason: "CLIENT_IDENTITY_UNAVAILABLE",
      retryAfterSec: 60,
      backend: "error",
    };
  }

  let clientHash: string;
  let subjectHash: string;
  let pairHash: string;
  try {
    clientHash = hmac("auth-client", clientIdentity);
    subjectHash = hmac("auth-subject", subject);
    pairHash = hmac("auth-pair", `${clientIdentity}\u0000${subject}`);
  } catch {
    return {
      allowed: false,
      reason: "CLIENT_IDENTITY_UNAVAILABLE",
      retryAfterSec: 60,
      backend: "error",
    };
  }

  const [clientResult, pairResult] = await Promise.all([
    consumeDistributedRateLimit({
      key: `auth-abuse:${input.action}:ip:${clientHash}`,
      limit: config.clientLimit,
      windowSec: config.windowSec,
    }),
    consumeDistributedRateLimit({
      key: `auth-abuse:${input.action}:pair:${pairHash}`,
      limit: config.pairLimit,
      windowSec: config.windowSec,
    }),
  ]);

  const backend = backendUnavailable(clientResult) ? clientResult.backend : pairResult.backend;
  const retryAfterSec = Math.max(
    boundedRetry(clientResult.resetSec, config.windowSec),
    boundedRetry(pairResult.resetSec, config.windowSec),
  );

  if (isProduction() && (backendUnavailable(clientResult) || backendUnavailable(pairResult))) {
    return {
      allowed: false,
      reason: "BACKEND_UNAVAILABLE",
      retryAfterSec,
      backend,
      clientHash,
      subjectHash,
    };
  }

  if (!clientResult.allowed || !pairResult.allowed) {
    return {
      allowed: false,
      reason: "RATE_LIMITED",
      retryAfterSec,
      backend,
      clientHash,
      subjectHash,
    };
  }

  return {
    allowed: true,
    retryAfterSec: 0,
    backend,
    clientHash,
    subjectHash,
  };
}
