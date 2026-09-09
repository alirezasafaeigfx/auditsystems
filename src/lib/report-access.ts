import crypto from "node:crypto";

const ACCESS_TTL_SECONDS = 15 * 60;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function getSecret(): string | null {
  const secret = process.env.REPORT_ACCESS_SECRET?.trim() || "";
  return Buffer.byteLength(secret, "utf8") >= 32 ? secret : null;
}

function reportDigest(reportToken: string): string {
  return crypto.createHash("sha256").update(reportToken).digest("hex");
}

function signature(data: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

export function getReportAccessCookieName(reportToken: string): string {
  return `report_access_${reportDigest(reportToken).slice(0, 24)}`;
}

export function createReportAccessCredential(reportToken: string, now: Date = new Date()): string {
  const secret = getSecret();
  if (!secret) throw new Error("REPORT_ACCESS_SECRET must contain at least 32 bytes");
  const expiresAt = Math.floor(now.getTime() / 1000) + ACCESS_TTL_SECONDS;
  const payload = `v1.${expiresAt}.${reportDigest(reportToken)}`;
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyReportAccessCredential(
  credential: string | null | undefined,
  reportToken: string,
  now: Date = new Date(),
): boolean {
  const secret = getSecret();
  if (!secret || !credential) return false;

  const parts = credential.split(".");
  if (parts.length !== 4) return false;
  const [version, expiryText, digest, actualSignature] = parts;
  if (
    version !== "v1"
    || !/^\d{10,}$/.test(expiryText)
    || !DIGEST_PATTERN.test(digest)
    || !SIGNATURE_PATTERN.test(actualSignature)
    || digest !== reportDigest(reportToken)
  ) {
    return false;
  }

  const expiresAt = Number(expiryText);
  const nowSeconds = Math.floor(now.getTime() / 1000);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= nowSeconds) return false;

  const payload = `${version}.${expiryText}.${digest}`;
  const expectedSignature = signature(payload, secret);
  const actual = Buffer.from(actualSignature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function readReportAccessCredential(cookieHeader: string | null, reportToken: string): string | null {
  if (!cookieHeader) return null;
  const expectedName = getReportAccessCookieName(reportToken);
  for (const item of cookieHeader.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;
    const name = item.slice(0, separator).trim();
    if (name !== expectedName) continue;
    return item.slice(separator + 1).trim() || null;
  }
  return null;
}

export function serializeReportAccessCookie(
  reportToken: string,
  credential: string,
  secure: boolean = process.env.NODE_ENV === "production",
): string {
  const attributes = [
    `${getReportAccessCookieName(reportToken)}=${credential}`,
    "Path=/",
    `Max-Age=${ACCESS_TTL_SECONDS}`,
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}
