const PRODUCTION_FALLBACK_URL = "https://audit.alirezasafaeisystems.ir";
const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

function isStrictBaseUrlEnforced(): boolean {
  return process.env.APP_BASE_URL_STRICT === "true" || process.env.VERCEL_ENV === "production";
}

function parseBaseUrlOrThrow(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("APP_BASE_URL_INVALID");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("APP_BASE_URL_PROTOCOL_INVALID");
  }

  return parsed;
}

export function getAppBaseUrl(): string {
  const raw = String(process.env.APP_BASE_URL ?? "").trim();
  const strict = isStrictBaseUrlEnforced();

  if (!raw) {
    if (strict) {
      throw new Error("APP_BASE_URL_MISSING");
    }
    if (process.env.NODE_ENV === "production") {
      return PRODUCTION_FALLBACK_URL;
    }
    return PRODUCTION_FALLBACK_URL;
  }

  const parsed = parseBaseUrlOrThrow(raw);

  if (strict && LOCALHOST_HOSTNAMES.has(parsed.hostname)) {
    throw new Error("APP_BASE_URL_LOCALHOST_NOT_ALLOWED");
  }

  return parsed.origin;
}

export function toAbsoluteUrl(path: string): string {
  const base = getAppBaseUrl();
  if (!path) return base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
