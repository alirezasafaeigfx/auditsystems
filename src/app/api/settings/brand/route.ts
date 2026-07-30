import { NextResponse } from "next/server";
import { validateSession, getOrganizationForUser } from "../../../../lib/auth";
import { prisma } from "../../../../lib/db";
import { csrfProtection } from "../../../../lib/csrf";
import { logEvent } from "../../../../lib/observability";
import { hasMinimumRole } from "../../../../lib/team-auth";

const MAX_BRAND_NAME_LENGTH = 200;
const MAX_LOGO_BYTES = 512 * 1024;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const LOGO_DATA_URL = /^data:image\/(png|jpeg);base64,([a-z0-9+/]+={0,2})$/i;

function parseNullableText(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error("INVALID_TEXT");
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) throw new Error("TEXT_TOO_LONG");
  return normalized;
}

function parseColor(value: unknown): string | null {
  const color = parseNullableText(value, 7);
  if (color && !HEX_COLOR.test(color)) throw new Error("INVALID_COLOR");
  return color;
}

function parseLogo(value: unknown): string | null {
  const logo = parseNullableText(value, 800_000);
  if (!logo) return null;

  const match = LOGO_DATA_URL.exec(logo);
  if (!match) throw new Error("INVALID_LOGO_FORMAT");

  const decoded = Buffer.from(match[2], "base64");
  if (decoded.byteLength > MAX_LOGO_BYTES) throw new Error("LOGO_TOO_LARGE");
  return logo;
}

export async function GET() {
  const user = await validateSession();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const membership = await getOrganizationForUser(user.id);
  if (!membership) {
    return NextResponse.json({ error: "NO_ORG" }, { status: 404 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
    select: {
      name: true,
      brandName: true,
      brandLogoBase64: true,
      primaryColor: true,
      secondaryColor: true
    }
  });

  return NextResponse.json(org, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const csrfCheck = await csrfProtection(request);
  if (!csrfCheck.valid) {
    logEvent("warn", "brand_csrf_failed", { error: csrfCheck.error });
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const user = await validateSession();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const membership = await getOrganizationForUser(user.id);
  if (!membership) {
    return NextResponse.json({ error: "NO_ORG" }, { status: 404 });
  }
  if (!hasMinimumRole(membership.role, "ADMIN")) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  try {
    const payload = body as Record<string, unknown>;
    const brandName = parseNullableText(payload.brandName, MAX_BRAND_NAME_LENGTH);
    const brandLogoBase64 = parseLogo(payload.brandLogoBase64);
    const primaryColor = parseColor(payload.primaryColor);
    const secondaryColor = parseColor(payload.secondaryColor);

    await prisma.organization.update({
      where: { id: membership.organizationId },
      data: { brandName, brandLogoBase64, primaryColor, secondaryColor }
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_PAYLOAD";
    if (["INVALID_TEXT", "TEXT_TOO_LONG", "INVALID_COLOR", "INVALID_LOGO_FORMAT", "LOGO_TOO_LARGE"].includes(code)) {
      return NextResponse.json({ error: code }, { status: 400 });
    }
    throw error;
  }

  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
