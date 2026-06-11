import crypto from "node:crypto";

const DOWNLOAD_SECRET = process.env.DOWNLOAD_TOKEN_SECRET;

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
    exp: Math.floor(Date.now() / 1000) + (input.ttlSec ?? 20 * 60)
  };

  const encoded = base64UrlEncode(JSON.stringify(payload));
  const sig = sign(encoded);
  return `${encoded}.${sig}`;
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
