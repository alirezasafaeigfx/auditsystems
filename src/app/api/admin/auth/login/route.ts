import { NextRequest, NextResponse } from "next/server";
import { validateAdminCredentials, createAdminSession, isSessionAuthConfigured } from "@/lib/admin-auth";
import { csrfProtection } from "@/lib/csrf";
import { enforceAuthAbuseLimit } from "@/lib/authRateLimit";

function abuseResponse(
  result: Awaited<ReturnType<typeof enforceAuthAbuseLimit>>,
) {
  const unavailable = result.reason === "CLIENT_IDENTITY_UNAVAILABLE" || result.reason === "BACKEND_UNAVAILABLE";
  return NextResponse.json(
    { error: unavailable ? "AUTH_ABUSE_CONTROL_UNAVAILABLE" : "RATE_LIMITED" },
    {
      status: unavailable ? 503 : 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(Math.max(1, result.retryAfterSec)),
      },
    },
  );
}

export async function POST(request: NextRequest) {
  if (!isSessionAuthConfigured()) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const csrfCheck = await csrfProtection(request);
  if (!csrfCheck.valid) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  let credentials: unknown;
  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  if (
    !credentials ||
    typeof credentials !== "object" ||
    typeof (credentials as { username?: unknown }).username !== "string" ||
    typeof (credentials as { password?: unknown }).password !== "string"
  ) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const raw = credentials as { username: string; password: string };
  const username = raw.username.trim().toLowerCase();
  const abuse = await enforceAuthAbuseLimit({
    action: "admin-login",
    subject: username,
    request,
  });
  if (!abuse.allowed) return abuseResponse(abuse);

  if (!validateAdminCredentials(username, raw.password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  try {
    await createAdminSession();
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Failed to create admin session" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
