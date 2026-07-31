import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./db";
import { runDueScheduledAudits } from "./scheduled-audit-runner";

const integrationEnabled = process.env.SCHEDULED_AUDIT_INTEGRATION === "true";
const describePostgres = integrationEnabled ? describe : describe.skip;
let fixtureSequence = 0;

describePostgres("scheduled audit runner — PostgreSQL", () => {
  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(async () => {
    await prisma.billingEvent.deleteMany();
    await prisma.usageLedger.deleteMany();
    await prisma.job.deleteMany();
    await prisma.reportShare.deleteMany();
    await prisma.auditRun.deleteMany();
    await prisma.scheduledAudit.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.project.deleteMany();
    await prisma.plan.deleteMany();
    await prisma.organization.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function fixture(input: {
    scheduledAudits?: boolean;
    monthlyAuditLimit?: number;
    frequency?: string;
    now?: Date;
  } = {}) {
    fixtureSequence += 1;
    const now = input.now ?? new Date("2026-01-31T10:15:00.000Z");
    const suffix = `${fixtureSequence}-${Date.now()}`;
    const plan = await prisma.plan.create({
      data: {
        code: `schedule-plan-${suffix}`,
        name: `Schedule Plan ${suffix}`,
        monthlyAuditLimit: input.monthlyAuditLimit ?? 10,
        scheduledAudits: input.scheduledAudits ?? true,
      },
    });
    const organization = await prisma.organization.create({
      data: { name: `Org ${suffix}`, slug: `schedule-org-${suffix}` },
    });
    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: `Project ${suffix}`,
        domain: "example.com",
        normalizedUrl: "https://example.com/",
      },
    });
    await prisma.subscription.create({
      data: {
        organizationId: organization.id,
        planId: plan.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    const schedule = await prisma.scheduledAudit.create({
      data: {
        organizationId: organization.id,
        projectId: project.id,
        frequency: input.frequency ?? "MONTHLY",
        enabled: true,
        createdAt: now,
        nextRunAt: now,
      },
    });

    return { now, plan, organization, project, schedule };
  }

  it("claims one occurrence once across concurrent scheduler processes", async () => {
    const data = await fixture();

    const [first, second] = await Promise.all([
      runDueScheduledAudits({ now: data.now, maxSchedules: 1 }),
      runDueScheduledAudits({ now: data.now, maxSchedules: 1 }),
    ]);

    expect(first.enqueued + second.enqueued).toBe(1);
    expect(first.processed + second.processed).toBe(1);
    expect(await prisma.auditRun.count()).toBe(1);
    expect(await prisma.reportShare.count()).toBe(1);
    expect(await prisma.job.count()).toBe(1);
    expect(await prisma.usageLedger.count({ where: { type: "SCHEDULED_AUDIT" } })).toBe(1);
    expect(await prisma.billingEvent.count({ where: { eventType: "SCHEDULE_ENQUEUED" } })).toBe(1);

    const schedule = await prisma.scheduledAudit.findUniqueOrThrow({ where: { id: data.schedule.id } });
    expect(schedule.lastRunAt?.toISOString()).toBe(data.now.toISOString());
    expect(schedule.nextRunAt.toISOString()).toBe("2026-02-28T10:15:00.000Z");

    const replay = await runDueScheduledAudits({ now: data.now, maxSchedules: 1 });
    expect(replay.processed).toBe(0);
    expect(await prisma.auditRun.count()).toBe(1);
  });

  it("records quota skips without enqueueing or advancing the occurrence", async () => {
    const data = await fixture({ monthlyAuditLimit: 0 });

    const summary = await runDueScheduledAudits({ now: data.now, maxSchedules: 1 });

    expect(summary.quotaSkipped).toBe(1);
    expect(summary.failed).toBe(0);
    expect(summary.results[0]?.kind).toBe("quota");
    expect(await prisma.auditRun.count()).toBe(0);
    expect(await prisma.job.count()).toBe(0);
    expect(await prisma.usageLedger.count()).toBe(0);
    expect(await prisma.billingEvent.count({ where: { eventType: "SCHEDULE_QUOTA_SKIPPED" } })).toBe(1);

    const schedule = await prisma.scheduledAudit.findUniqueOrThrow({ where: { id: data.schedule.id } });
    expect(schedule.enabled).toBe(true);
    expect(schedule.lastRunAt).toBeNull();
    expect(schedule.nextRunAt.toISOString()).toBe(data.now.toISOString());
  });

  it("disables schedules whose active entitlement no longer permits scheduling", async () => {
    const data = await fixture({ scheduledAudits: false });

    const summary = await runDueScheduledAudits({ now: data.now, maxSchedules: 1 });

    expect(summary.disabled).toBe(1);
    expect(await prisma.auditRun.count()).toBe(0);
    expect(await prisma.billingEvent.count({ where: { eventType: "SCHEDULE_DISABLED_ENTITLEMENT" } })).toBe(1);
    const schedule = await prisma.scheduledAudit.findUniqueOrThrow({ where: { id: data.schedule.id } });
    expect(schedule.enabled).toBe(false);
    expect(schedule.nextRunAt.toISOString()).toBe(data.now.toISOString());
  });

  it("does not enqueue or advance while the project already has an active run", async () => {
    const data = await fixture();
    const activeRun = await prisma.auditRun.create({
      data: {
        url: "https://example.com/",
        normalizedUrl: "https://example.com/",
        projectId: data.project.id,
        organizationId: data.organization.id,
        status: "RUNNING",
        reportStatus: "RUNNING",
      },
    });

    const summary = await runDueScheduledAudits({ now: data.now, maxSchedules: 1 });

    expect(summary.overlaps).toBe(1);
    expect(summary.results[0]).toEqual({
      kind: "overlap",
      scheduleId: data.schedule.id,
      activeRunId: activeRun.id,
    });
    expect(await prisma.auditRun.count()).toBe(1);
    expect(await prisma.job.count()).toBe(0);
    const schedule = await prisma.scheduledAudit.findUniqueOrThrow({ where: { id: data.schedule.id } });
    expect(schedule.nextRunAt.toISOString()).toBe(data.now.toISOString());
  });

  it("rolls back the whole occurrence and records consecutive failures", async () => {
    const data = await fixture({ frequency: "BROKEN" });

    const first = await runDueScheduledAudits({ now: data.now, maxSchedules: 1 });
    const second = await runDueScheduledAudits({ now: data.now, maxSchedules: 1 });

    expect(first.failed).toBe(1);
    expect(first.results[0]).toMatchObject({ kind: "failed", consecutiveFailures: 1 });
    expect(second.failed).toBe(1);
    expect(second.results[0]).toMatchObject({ kind: "failed", consecutiveFailures: 2 });
    expect(await prisma.auditRun.count()).toBe(0);
    expect(await prisma.reportShare.count()).toBe(0);
    expect(await prisma.job.count()).toBe(0);
    expect(await prisma.usageLedger.count()).toBe(0);
    expect(await prisma.billingEvent.count({ where: { eventType: "SCHEDULE_PROCESSING_FAILED" } })).toBe(2);

    const schedule = await prisma.scheduledAudit.findUniqueOrThrow({ where: { id: data.schedule.id } });
    expect(schedule.lastRunAt).toBeNull();
    expect(schedule.nextRunAt.toISOString()).toBe(data.now.toISOString());
  });
});
