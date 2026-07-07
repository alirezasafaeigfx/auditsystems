import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin-auth";
import { getBillingEvents, type BillingEventType } from "@/lib/billing-events";

const VALID_EVENT_TYPES = new Set([
  "checkout_created",
  "payment_success",
  "payment_failed",
  "subscription_created",
  "subscription_upgraded",
  "subscription_downgraded",
  "subscription_canceled",
  "subscription_reactivated",
  "invoice_created",
  "invoice_paid",
  "invoice_failed",
]);

export async function GET(request: NextRequest) {
  const isAuthenticated = await validateAdminSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams;
  const organizationId = query.get("organizationId");
  if (!organizationId) {
    return NextResponse.json({ error: "organizationId required" }, { status: 400 });
  }

  const eventType = query.get("eventType");
  if (eventType && !VALID_EVENT_TYPES.has(eventType)) {
    return NextResponse.json({ error: "Invalid eventType" }, { status: 400 });
  }

  const from = query.get("from") ? new Date(query.get("from")!) : undefined;
  const to = query.get("to") ? new Date(query.get("to")!) : undefined;
  const limit = Math.min(parseInt(query.get("limit") ?? "50", 10), 200);
  const offset = parseInt(query.get("offset") ?? "0", 10);

  const result = await getBillingEvents({
    organizationId,
    eventType: eventType as BillingEventType | undefined,
    from,
    to,
    limit,
    offset,
  });

  return NextResponse.json(result);
}
