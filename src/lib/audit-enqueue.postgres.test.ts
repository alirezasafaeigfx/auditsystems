import crypto from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./db";
import {
  AuditEnqueueError,
  buildAuditIdempotencyKey,
  enqueueAuditAtomically,
} from "./audit-enqueue";

const integrationEnabled = process.env.AUDIT_ENQUEUE_INTEGRATION === "true";
const describePostgres = integrationEnabled ? describe : describe.skip;

describePostgres("atomic audit enqueue — PostgreSQL", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(async () => {
    // This suite runs only against its dedicated ephemeral CI database.
    await prisma.job.deleteMany();
    await prisma.auditLead.deleteMany();
    await prisma.auditRun.deleteMany();
    await prisma.project.deleteMany();
    await prisma.usageLedger.deleteMany();
    await prisma.organization.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function organizationWithProject() {
    const suffix = crypto.randomUUID();
    const organization = await prisma.organization.create({
      data: { name: `Atomic Test ${suffix}`, slug: `atomic-test-${suffix}` },
    });
    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: "Atomic Project",
        domain: "example.com",
        normalizedUrl: "https://example.com/",
      },
    });
    return { organization, project };
  }

  it("commits one run/share/job/usage for concurrent identical requests", async () => {
    const { organization, project } = await organizationWithProject();
    const idempotencyKey = buildAuditIdempotencyKey({
      source: "PROJECT_API",
      scope: `${organization.id}:${project.id}`,
      rawKey: "same-request",
    });
    const input = {
      url: "https://example.com/",
      normalizedUrl: "https://example.com/",
      depth: "QUICK" as const,
      projectId: project.id,
      organizationId: organization.id,
      locale: "en",
      source: "PROJECT_API" as const,
      idempotencyKey,
      auditLimit: 10,
      usage: { type: "AUDIT_RUN" as const },
    };

    const [first, second] = await Promise.all([
      enqueueAuditAtomically(input),
      enqueueAuditAtomically(input),
    ]);

    expect(first.run.id).toBe(second.run.id);
    expect(first.share.token).toBe(second.share.token);
    expect([first.reused, second.reused].sort()).toEqual([false, true]);
    expect(await prisma.auditRun.count({ where: { organizationId: organization.id } })).toBe(1);
    expect(await prisma.reportShare.count({ where: { runId: first.run.id } })).toBe(1);
    expect(await prisma.job.count({
      where: { payload: { path: ["idempotencyKey"], equals: idempotencyKey } },
    })).toBe(1);
    expect(await prisma.usageLedger.count({
      where: { organizationId: organization.id, type: "AUDIT_RUN" },
    })).toBe(1);
  });

  it("enforces an organization quota under concurrent different keys", async () => {
    const { organization, project } = await organizationWithProject();
    const input = (rawKey: string) => ({
      url: "https://example.com/",
      normalizedUrl: "https://example.com/",
      projectId: project.id,
      organizationId: organization.id,
      source: "PROJECT_API" as const,
      idempotencyKey: buildAuditIdempotencyKey({
        source: "PROJECT_API",
        scope: `${organization.id}:${project.id}`,
        rawKey,
      }),
      auditLimit: 1,
      usage: { type: "AUDIT_RUN" as const },
    });

    const results = await Promise.allSettled([
      enqueueAuditAtomically(input("request-a")),
      enqueueAuditAtomically(input("request-b")),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(rejected?.reason).toBeInstanceOf(AuditEnqueueError);
    expect(rejected?.reason).toMatchObject({ code: "AUDIT_LIMIT_REACHED" });
    expect(await prisma.auditRun.count({ where: { organizationId: organization.id } })).toBe(1);
    expect(await prisma.job.count()).toBe(1);
    expect(await prisma.usageLedger.count({ where: { organizationId: organization.id } })).toBe(1);
  });

  it("rolls back run and share when a lead link loses its race", async () => {
    const existingRun = await prisma.auditRun.create({
      data: { url: "https://existing.example.com", status: "QUEUED", reportStatus: "QUEUED" },
    });
    const lead = await prisma.auditLead.create({
      data: {
        runId: existingRun.id,
        domain: "example.com",
        normalizedUrl: "https://example.com/",
        email: "lead@example.com",
        businessType: "test",
        primaryConcern: "test",
        consentPrivacy: true,
      },
    });
    const beforeRuns = await prisma.auditRun.count();
    const beforeShares = await prisma.reportShare.count();

    await expect(enqueueAuditAtomically({
      url: "https://example.com/",
      normalizedUrl: "https://example.com/",
      source: "ADMIN_LEAD",
      lead: { id: lead.id },
    })).rejects.toMatchObject({ code: "AUDIT_ALREADY_STARTED" });

    expect(await prisma.auditRun.count()).toBe(beforeRuns);
    expect(await prisma.reportShare.count()).toBe(beforeShares);
    expect(await prisma.job.count()).toBe(0);
  });

  it("rejects a project from another organization without side effects", async () => {
    const { organization, project } = await organizationWithProject();
    const other = await prisma.organization.create({
      data: {
        name: "Other Atomic Org",
        slug: `atomic-other-${crypto.randomUUID()}`,
      },
    });

    await expect(enqueueAuditAtomically({
      url: "https://example.com/",
      normalizedUrl: "https://example.com/",
      projectId: project.id,
      organizationId: other.id,
      source: "PROJECT_API",
      auditLimit: 10,
      usage: { type: "AUDIT_RUN" },
    })).rejects.toMatchObject({ code: "PROJECT_NOT_FOUND" });

    expect(await prisma.auditRun.count({ where: { organizationId: other.id } })).toBe(0);
    expect(await prisma.job.count()).toBe(0);
    expect(await prisma.usageLedger.count({ where: { organizationId: other.id } })).toBe(0);
    expect(await prisma.project.count({ where: { organizationId: organization.id } })).toBe(1);
  });

  it("does not create organization usage for public runs", async () => {
    const queued = await enqueueAuditAtomically({
      url: "https://public.example.com/",
      normalizedUrl: "https://public.example.com/",
      source: "PUBLIC_API",
      ipHash: "public-ip-hash",
      locale: "en",
    });

    expect(queued.reused).toBe(false);
    expect(await prisma.auditRun.count({ where: { id: queued.run.id } })).toBe(1);
    expect(await prisma.job.count({
      where: { payload: { path: ["runId"], equals: queued.run.id } },
    })).toBe(1);
    expect(await prisma.usageLedger.count()).toBe(0);
  });
});
