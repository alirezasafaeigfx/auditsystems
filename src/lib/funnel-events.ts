import { Prisma } from "@prisma/client";
import { prisma } from "./db";

export type FunnelEventType =
  | "lead_submitted"
  | "lead_duplicate_received"
  | "lead_qualified"
  | "lead_lost"
  | "audit_started"
  | "audit_retry_queued"
  | "report_review"
  | "report_delivered"
  | "audit_queue_failed";

export async function recordFunnelEvent(input: {
  eventType: FunnelEventType;
  leadId?: string | null;
  runId?: string | null;
  source?: string | null;
  placement?: string | null;
  offer?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.funnelEvent.create({
    data: {
      eventType: input.eventType,
      leadId: input.leadId ?? null,
      runId: input.runId ?? null,
      source: input.source ?? null,
      placement: input.placement ?? null,
      offer: input.offer ?? null,
      metadata: input.metadata ?? Prisma.JsonNull,
    },
  });
}
