import { destroySession } from "../../../../lib/auth";
import { createRequestId, logEvent, respondJson } from "../../../../lib/observability";

export async function POST() {
  const requestId = createRequestId();

  try {
    await destroySession();
    logEvent("info", "logout_success", { requestId });
    return respondJson({ ok: true, requestId }, requestId, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logEvent("error", "logout_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
