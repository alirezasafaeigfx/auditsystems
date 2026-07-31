import crypto from "node:crypto";
import {
  AuditDepth,
  AuditRun,
  Job,
  LeadStatus,
  Prisma,
  ReportShare,
} from "@prisma/client";
import { prisma } from "./db";
import { createReportToken } from "./token";

export type AuditEnqueueSource =
  | "PUBLIC_API"
  | "PROJECT_API"
  | "ADMIN_LEAD"
  | "SCHEDULED_AUDIT"
  | "SAMPLE_SCRIPT";

export type AuditUsageInput = {
  type: "AUDIT_RUN" | "SCHEDULED_AUDIT";
  quantity?: number;
  metadata?: Record<string, unknown>;
};

export type AuditLeadLinkInput = {
  id: string;
  status?: LeadStatus;
  qualifiedAt?: Date;
};

export type AtomicAuditEnqueueInput = {
  url: string;
  normalizedUrl?: string | null;
  depth?: AuditDepth;
  projectId?: string;
  organizationId?: string;
  ipHash?: string;
  userAgent?: string | null;
  locale?: string;
  source: AuditEnqueueSource;
  idempotencyKey?: string;
  jobTimeoutMs?: number;
  auditLimit?: number;
  lead?: AuditLeadLinkInput;
  usage?: AuditUsageInput;
  now?: Date;
};

export type AtomicAuditEnqueueResult = {
  run: AuditRun;
  share: ReportShare;
  job: Job;
  reused: boolean;
};

export class AuditEnqueueError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "AuditEnqueueError";
    this.code = code;
  }
}

const MAX_TRANSACTION_RETRIES = 3;
const MAX_IDEMPOTENCY_KEY_LENGTH = 160;
const DEFAULT_JOB_TIMEOUT_MS = 45_000;

function normalizedOptional(value: string | null | undefined): string | null {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function validateInput(input: AtomicAuditEnqueueInput): void {
  if (!input.url.trim()) throw new AuditEnqueueError("INVALID_AUDIT_URL");
  if (input.projectId && !input.organizationId) {
    throw new AuditEnqueueError("PROJECT_REQUIRES_ORGANIZATION");
  }
  if (input.usage && !input.organizationId) {
    throw new AuditEnqueueError("USAGE_REQUIRES_ORGANIZATION");
  }
  if (input.auditLimit !== undefined && (!Number.isInteger(input.auditLimit) || input.auditLimit < 0)) {
    throw new AuditEnqueueError("INVALID_AUDIT_LIMIT");
  }
  if (input.jobTimeoutMs !== undefined && (!Number.isInteger(input.jobTimeoutMs) || input.jobTimeoutMs <= 0)) {
    throw new AuditEnqueueError("INVALID_JOB_TIMEOUT");
  }
  if (input.idempotencyKey) {
    const length = Buffer.byteLength(input.idempotencyKey, "utf8");
    if (length < 1 || length > MAX_IDEMPOTENCY_KEY_LENGTH) {
      throw new AuditEnqueueError("INVALID_IDEMPOTENCY_KEY");
    }
  }
}

function stableFingerprint(input: AtomicAuditEnqueueInput): string {
  const material = JSON.stringify({
    source: input.source,
    url: input.url.trim(),
    normalizedUrl: normalizedOptional(input.normalizedUrl),
    depth: input.depth ?? AuditDepth.QUICK,
    projectId: normalizedOptional(input.projectId),
    organizationId: normalizedOptional(input.organizationId),
    ipHash: normalizedOptional(input.ipHash),
    locale: normalizedOptional(input.locale),
    leadId: normalizedOptional(input.lead?.id),
    usageType: input.usage?.type ?? null,
    usageQuantity: input.usage?.quantity ?? 1,
  });
  return crypto.createHash("sha256").update(material).digest("hex");
}

export function buildAuditIdempotencyKey(input: {
  source: AuditEnqueueSource;
  scope: string;
  rawKey: string;
}): string {
  const rawKey = input.rawKey.trim();
  const scope = input.scope.trim();
  if (!rawKey || Buffer.byteLength(rawKey, "utf8") > 200 || !scope) {
    throw new AuditEnqueueError("INVALID_IDEMPOTENCY_KEY");
  }

  const digest = crypto
    .createHash("sha256")
    .update(`${input.source}\u0000${scope}\u0000${rawKey}`)
    .digest("hex");
  return `v1:${input.source}:${digest}`;
}

function asPayload(value: Prisma.JsonValue): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function findExistingEnqueue(
  tx: Prisma.TransactionClient,
  idempotencyKey: string,
  fingerprint: string,
): Promise<AtomicAuditEnqueueResult | null> {
  const job = await tx.job.findFirst({
    where: {
      type: "AUDIT_RUN",
      payload: { path: ["idempotencyKey"], equals: idempotencyKey },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!job) return null;

  const payload = asPayload(job.payload);
  const runId = typeof payload?.runId === "string" ? payload.runId : "";
  const storedFingerprint = typeof payload?.fingerprint === "string" ? payload.fingerprint : "";
  if (!runId || !storedFingerprint) {
    throw new AuditEnqueueError("IDEMPOTENCY_STATE_CORRUPT");
  }
  if (storedFingerprint !== fingerprint) {
    throw new AuditEnqueueError("IDEMPOTENCY_KEY_CONFLICT");
  }

  const [run, share] = await Promise.all([
    tx.auditRun.findUnique({ where: { id: runId } }),
    tx.reportShare.findFirst({ where: { runId }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!run || !share) {
    throw new AuditEnqueueError("IDEMPOTENCY_STATE_CORRUPT");
  }

  return { run, share, job, reused: true };
}

function isRetryableTransactionError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function monthStart(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function jsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function createInTransaction(
  tx: Prisma.TransactionClient,
  input: AtomicAuditEnqueueInput,
  fingerprint: string,
  shareToken: string,
): Promise<AtomicAuditEnqueueResult> {
  if (input.idempotencyKey) {
    const existing = await findExistingEnqueue(tx, input.idempotencyKey, fingerprint);
    if (existing) return existing;
  }

  if (input.projectId && input.organizationId) {
    const project = await tx.project.findFirst({
      where: { id: input.projectId, organizationId: input.organizationId },
      select: { id: true },
    });
    if (!project) throw new AuditEnqueueError("PROJECT_NOT_FOUND");
  }

  const now = input.now ?? new Date();
  if (input.organizationId && input.auditLimit !== undefined) {
    const current = await tx.auditRun.count({
      where: {
        organizationId: input.organizationId,
        createdAt: { gte: monthStart(now) },
      },
    });
    if (current >= input.auditLimit) {
      throw new AuditEnqueueError("AUDIT_LIMIT_REACHED");
    }
  }

  const run = await tx.auditRun.create({
    data: {
      url: input.url.trim(),
      normalizedUrl: normalizedOptional(input.normalizedUrl),
      depth: input.depth ?? AuditDepth.QUICK,
      status: "QUEUED",
      reportStatus: "QUEUED",
      projectId: normalizedOptional(input.projectId),
      organizationId: normalizedOptional(input.organizationId),
      ipHash: normalizedOptional(input.ipHash),
      userAgent: normalizedOptional(input.userAgent),
      locale: normalizedOptional(input.locale),
    },
  });

  const share = await tx.reportShare.create({
    data: { runId: run.id, token: shareToken },
  });

  if (input.lead) {
    const linked = await tx.auditLead.updateMany({
      where: { id: input.lead.id, runId: null },
      data: {
        runId: run.id,
        status: input.lead.status ?? LeadStatus.QUALIFIED,
        qualifiedAt: input.lead.qualifiedAt ?? now,
      },
    });
    if (linked.count !== 1) throw new AuditEnqueueError("AUDIT_ALREADY_STARTED");
  }

  const payload: Record<string, unknown> = {
    runId: run.id,
    source: input.source,
    fingerprint,
  };
  if (input.idempotencyKey) payload.idempotencyKey = input.idempotencyKey;

  const job = await tx.job.create({
    data: {
      type: "AUDIT_RUN",
      payload: jsonValue(payload),
      timeoutMs: input.jobTimeoutMs ?? DEFAULT_JOB_TIMEOUT_MS,
    },
  });

  if (input.organizationId && input.usage) {
    await tx.usageLedger.create({
      data: {
        organizationId: input.organizationId,
        type: input.usage.type,
        quantity: input.usage.quantity ?? 1,
        metadata: jsonValue({
          ...(input.usage.metadata ?? {}),
          auditRunId: run.id,
          source: input.source,
          idempotencyKey: input.idempotencyKey ?? null,
        }),
      },
    });
  }

  return { run, share, job, reused: false };
}

export async function enqueueAuditInTransaction(
  tx: Prisma.TransactionClient,
  input: AtomicAuditEnqueueInput,
): Promise<AtomicAuditEnqueueResult> {
  validateInput(input);
  return createInTransaction(tx, input, stableFingerprint(input), createReportToken());
}

async function readCommittedExisting(
  idempotencyKey: string,
  fingerprint: string,
): Promise<AtomicAuditEnqueueResult | null> {
  return prisma.$transaction((tx) => findExistingEnqueue(tx, idempotencyKey, fingerprint));
}

export async function enqueueAuditAtomically(
  input: AtomicAuditEnqueueInput,
): Promise<AtomicAuditEnqueueResult> {
  validateInput(input);
  const fingerprint = stableFingerprint(input);
  const shareToken = createReportToken();

  for (let attempt = 1; attempt <= MAX_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(
        (tx) => createInTransaction(tx, input, fingerprint, shareToken),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (input.idempotencyKey && isUniqueConstraintError(error)) {
        const existing = await readCommittedExisting(input.idempotencyKey, fingerprint);
        if (existing) return existing;
      }
      if (isRetryableTransactionError(error) && attempt < MAX_TRANSACTION_RETRIES) {
        continue;
      }
      throw error;
    }
  }

  throw new AuditEnqueueError("AUDIT_ENQUEUE_RETRY_EXHAUSTED");
}
