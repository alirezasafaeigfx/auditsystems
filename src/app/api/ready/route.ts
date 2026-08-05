import { NextResponse } from "next/server";
import { buildReadinessReport } from "../../../lib/health";
import { createRequestId, logEvent } from "../../../lib/observability";

export const dynamic = "force-dynamic";
const READINESS_CACHE_CONTROL = "no-store";

export async function GET() {
  const startedAt = Date.now();
  const requestId = createRequestId();
  const report = await buildReadinessReport("asdev-audit-ir");
  const statusCode = report.ok ? 200 : 503;

  if (!report.ok) {
    logEvent("error", "readiness_degraded", {
      requestId,
      service: report.service,
      checks: report.checks.map((check) => ({
        name: check.name,
        status: check.status,
        latencyMs: check.latencyMs,
        detail: check.detail,
      })),
    });
  }

  return NextResponse.json(
    {
      status: report.ok ? "ready" : "degraded",
      ok: report.ok,
      service: "auditsystems",
      requestId,
      responseMs: Date.now() - startedAt,
      timestamp: report.timestamp,
      checks: report.checks.map((check) => ({
        name: check.name,
        status: check.status,
      })),
    },
    {
      status: statusCode,
      headers: {
        "Cache-Control": READINESS_CACHE_CONTROL,
      },
    },
  );
}

export async function HEAD() {
  const response = await GET();
  return new NextResponse(null, { status: response.status, headers: response.headers });
}
