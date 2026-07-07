import { NextRequest } from "next/server";
import { validateSession } from "../../../../lib/auth";
import { getBillingEvents, type BillingEventType } from "../../../../lib/billing-events";
import { createRequestId, logEvent, respondJson } from "../../../../lib/observability";

export async function GET(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const user = await validateSession();
    if (!user) {
      return respondJson({ error: "UNAUTHORIZED", requestId }, requestId, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get("eventType") as BillingEventType | null;
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const result = await getBillingEvents({
      organizationId: user.id,
      eventType: eventType ?? undefined,
      limit,
      offset,
    });

    logEvent("info", "billing_events_listed", { requestId, userId: user.id, count: result.total });
    return respondJson({ events: result.events, total: result.total, requestId }, requestId);
  } catch (error) {
    logEvent("error", "billing_events_failed", { requestId, error: error instanceof Error ? error.message : String(error) });
    return respondJson({ error: "INTERNAL_ERROR", requestId }, requestId, { status: 500 });
  }
}
