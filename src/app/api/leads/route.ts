import { NextRequest } from "next/server";
import { prisma } from "../../../lib/db";
import { consumeDistributedRateLimit } from "../../../lib/rateLimit";
import { getClientIp, hashClientIp } from "../../../lib/security";
import { createLogger } from "../../../lib/logger";
import { createRequestId, respondJson } from "../../../lib/observability";
import { validateLeadIntake } from "../../../lib/lead-delivery";
import { recordFunnelEvent } from "../../../lib/funnel-events";

const RATE_LIMIT_WINDOW_SEC = 60 * 60;
const RATE_LIMIT_MAX = 6;

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  const logger = createLogger({ requestId });
  const ipHash = hashClientIp(getClientIp(request));

  const limited = await consumeDistributedRateLimit({
    key: `audit:lead:${ipHash}`,
    limit: RATE_LIMIT_MAX,
    windowSec: RATE_LIMIT_WINDOW_SEC,
  });

  if (!limited.allowed) {
    logger.warn("lead_intake_rate_limited", { ipHash, backend: limited.backend });
    return respondJson({ error: "RATE_LIMITED", requestId }, requestId, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return respondJson({ error: "INVALID_JSON", requestId }, requestId, { status: 400 });
  }

  const validated = await validateLeadIntake(body);
  if (!validated.ok) {
    return respondJson({ error: validated.error, requestId }, requestId, { status: 400 });
  }

  const recentDuplicate = await prisma.auditLead.findFirst({
    where: {
      email: validated.value.email,
      normalizedUrl: validated.value.normalizedUrl,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    select: { id: true },
  });

  if (recentDuplicate) {
    logger.info("lead_intake_duplicate_reused", { leadId: recentDuplicate.id });
    await recordFunnelEvent({
      eventType: "lead_duplicate_received",
      leadId: recentDuplicate.id,
      source: validated.value.leadSource,
      placement: validated.value.sourcePlacement,
      offer: validated.value.sourceOffer,
      metadata: { submitEventId: validated.value.submitEventId },
    });
    return respondJson({ accepted: true, requestId }, requestId, { status: 202 });
  }

  const lead = await prisma.auditLead.create({
    data: validated.value,
    select: { id: true, leadSource: true },
  });

  logger.info("lead_intake_created", {
    leadId: lead.id,
    leadSource: lead.leadSource,
    sourcePlacement: validated.value.sourcePlacement,
    sourceOffer: validated.value.sourceOffer,
  });

  await recordFunnelEvent({
    eventType: "lead_submitted",
    leadId: lead.id,
    source: lead.leadSource,
    placement: validated.value.sourcePlacement,
    offer: validated.value.sourceOffer,
    metadata: { submitEventId: validated.value.submitEventId },
  });

  return respondJson({ accepted: true, requestId }, requestId, { status: 202 });
}
