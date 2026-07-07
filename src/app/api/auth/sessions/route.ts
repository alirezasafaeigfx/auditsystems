import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../lib/db";
import { validateSession } from "../../../../lib/auth";
import { createRequestId, logEvent, respondJson } from "../../../../lib/observability";
import { csrfProtection } from "../../../../lib/csrf";

const SESSION_COOKIE = "saas_session";

function maskToken(token: string): string {
  return `${token.slice(0, 4)}••••${token.slice(-4)}`;
}

export async function GET() {
  const requestId = createRequestId();

  try {
    const user = await validateSession();
    if (!user) {
      return respondJson({ error: "UNAUTHORIZED", requestId }, requestId, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE);
    const currentTokenParts = cookie?.value.split(":");
    const currentToken = currentTokenParts?.[0] ?? "";

    const sessions = await prisma.session.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        token: true,
        createdAt: true,
        expiresAt: true
      }
    });

    const result = sessions.map((s) => ({
      id: s.id,
      tokenPrefix: maskToken(s.token),
      isCurrent: s.token === currentToken,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      isExpired: s.expiresAt < new Date()
    }));

    logEvent("info", "sessions_listed", { requestId, userId: user.id, count: result.length });
    return respondJson({ sessions: result, requestId }, requestId, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logEvent("error", "sessions_list_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const csrfCheck = await csrfProtection(request);
    if (!csrfCheck.valid) {
      logEvent("warn", "sessions_csrf_failed", { requestId });
      return respondJson({ error: "FORBIDDEN", requestId }, requestId, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    const user = await validateSession();
    if (!user) {
      return respondJson({ error: "UNAUTHORIZED", requestId }, requestId, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE);
    const currentToken = cookie?.value.split(":")[0] ?? "";

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("id");
    const revokeAll = searchParams.get("all") === "true";

    if (revokeAll) {
      const deleted = await prisma.session.deleteMany({
        where: {
          userId: user.id,
          token: { not: currentToken }
        }
      });
      logEvent("info", "sessions_revoked_all", { requestId, userId: user.id, count: deleted.count });
      return respondJson({ ok: true, revokedCount: deleted.count, requestId }, requestId, { headers: { "Cache-Control": "no-store" } });
    }

    if (sessionId) {
      const session = await prisma.session.findFirst({
        where: { id: sessionId, userId: user.id }
      });

      if (!session) {
        return respondJson({ error: "NOT_FOUND", requestId }, requestId, { status: 404, headers: { "Cache-Control": "no-store" } });
      }

      if (session.token === currentToken) {
        return respondJson({ error: "CANNOT_REVOKE_CURRENT", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
      }

      await prisma.session.delete({ where: { id: sessionId } });
      logEvent("info", "session_revoked", { requestId, userId: user.id, sessionId });
      return respondJson({ ok: true, requestId }, requestId, { headers: { "Cache-Control": "no-store" } });
    }

    return respondJson({ error: "MISSING_PARAMS", requestId }, requestId, { status: 400, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logEvent("error", "session_revoke_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
