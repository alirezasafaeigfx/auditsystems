import { createHmac, timingSafeEqual } from "node:crypto";

const DOMAIN_SEPARATOR = "asdev-audit-v1";

export function signToken(
  payload: string,
  secret: string,
  domain: string = DOMAIN_SEPARATOR
): string {
  if (!secret) throw new Error("HMAC secret is required");
  if (!payload) throw new Error("Payload is required");

  const signature = createHmac("sha256", secret)
    .update(`${domain}:${payload}`)
    .digest("hex");

  return Buffer.from(`${payload}:${signature}`).toString("base64");
}

export function verifyToken(
  token: string,
  secret: string,
  domain: string = DOMAIN_SEPARATOR
): string | null {
  if (!secret) return null;
  if (!token) return null;

  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon === -1) return null;

    const payload = decoded.slice(0, lastColon);
    const signature = decoded.slice(lastColon + 1);

    if (!payload) return null;
    if (signature.length !== 64) return null;

    const expectedSig = createHmac("sha256", secret)
      .update(`${domain}:${payload}`)
      .digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;

    return payload;
  } catch {
    return null;
  }
}

export function signUnsubToken(organizationId: string, secret: string): string {
  return signToken(`unsub:${organizationId}`, secret, "asdev-unsub-v1");
}

export function verifyUnsubToken(
  token: string,
  secret: string
): string | null {
  const payload = verifyToken(token, secret, "asdev-unsub-v1");
  if (!payload) return null;
  if (!payload.startsWith("unsub:")) return null;
  const orgId = payload.slice(6);
  if (!orgId || orgId.length < 1) return null;
  return orgId;
}
