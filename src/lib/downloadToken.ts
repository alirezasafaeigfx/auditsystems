import crypto from "node:crypto";

const DOWNLOAD_SECRET = process.env.DOWNLOAD_TOKEN_SECRET;
const DOWNLOAD_TTL_SECONDS = 20 * 60;

function requireSecret(): string {
  if (!DOWNLOAD_SECRET) {
    throw new Error("DOWNLOAD_TOKEN_SECRET environment variable is required but not set");
  }
  return DOWNLOAD_SECRET;
}

export type DownloadTokenPayload = {
  runId: string;
  orderId: string;
  email: string;
  exp: number;
};

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(data: string): string {
  const secret = requireSecret();
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

export function createDownloadToken(input: { runId: string; orderId: string; email: string; ttlSec?: number }): string {
  const payload: DownloadTokenPayload = {
    runId: input.runId,
    orderId: input.orderId,
    email: input.email,
    exp: Math.floor(Date.now() / 1000) + (input.ttlSec ?? DOWNLOAD_TTL_SECONDS)
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));
  const sig = sign(encoded);
  return `${encoded}.${sig}`;
}

export function getDownloadCookieName(reportToken: string): string {
  const digest = crypto.createHash("sha256").update(reportToken).digest("hex");
  return `report_download_${digest.slice(0, 24)}`;
}

export function serializeDownloadTokenCookie(
  reportToken: string,
  downloadToken: string,
  secure: boolean = process.env.NODE_ENV === "production",
): string {
  const attributes = [
    `${getDownloadCookieName(reportToken)}=${downloadToken}`,
    "Path=/",
    `Max-Age=${DOWNLOAD_TTL_SECONDS}`,
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

export function readDownloadTokenCookie(cookieHeader: string | null, reportToken: string): string | null {
  if (!cookieHeader) return null;
  const expectedName = getDownloadCookieName(reportToken);
  for (const item of cookieHeader.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0 || item.slice(0, separator).trim() !== expectedName) continue;
    return item.slice(separator + 1).trim() || null;
  }
  return null;
}

export function verifyDownloadToken(token: string): DownloadTokenPayload | null {
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;

  const expected = sign(encoded);
  const providedBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as DownloadTokenPayload;
    if (!payload.runId || !payload.orderId || !payload.email || !payload.exp) {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
