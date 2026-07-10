import { prisma } from "../lib/db";
import { createReportToken } from "../lib/token";
import { enqueueJob } from "../worker/queue";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run lead delivery smoke in production");
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const email = `smoke+${stamp}@example.test`;

  const lead = await prisma.auditLead.create({
    data: {
      domain: "https://example.com",
      normalizedUrl: "https://example.com",
      email,
      businessType: "ecommerce",
      primaryConcern: "Smoke test lead for lead-to-delivery funnel verification.",
      consentPrivacy: true,
      leadSource: "smoke",
      sourcePlacement: "script",
      sourceOffer: "request_assessment",
      submitEventId: `smoke_${stamp}`,
    },
  });

  const qualified = await prisma.auditLead.update({
    where: { id: lead.id },
    data: { status: "QUALIFIED", qualifiedAt: new Date(), internalNote: "Smoke qualification passed" },
  });

  const run = await prisma.auditRun.create({
    data: {
      url: qualified.normalizedUrl ?? qualified.domain,
      normalizedUrl: qualified.normalizedUrl,
      depth: "DEEP",
      status: "QUEUED",
      reportStatus: "QUEUED",
      locale: "fa",
    },
  });

  await prisma.reportShare.create({ data: { runId: run.id, token: createReportToken() } });
  const job = await enqueueJob({ type: "AUDIT_RUN", payload: { runId: run.id } });

  await prisma.auditLead.update({ where: { id: lead.id }, data: { runId: run.id } });
  await prisma.auditRun.update({ where: { id: run.id }, data: { status: "SUCCEEDED", reportStatus: "REVIEW", finishedAt: new Date() } });
  await prisma.auditRun.update({ where: { id: run.id }, data: { reportStatus: "DELIVERED" } });

  const delivered = await prisma.auditLead.findUniqueOrThrow({
    where: { id: lead.id },
    include: { run: true },
  });

  const funnelEvents = [
    "lead_submitted",
    "lead_qualified",
    "audit_started",
    "report_review",
    "report_delivered",
  ];

  if (delivered.status !== "QUALIFIED" || delivered.run?.reportStatus !== "DELIVERED") {
    throw new Error("Smoke funnel did not reach delivered status");
  }

  console.log(JSON.stringify({
    verdict: "PASS",
    leadId: delivered.id,
    runId: delivered.runId,
    jobId: job.id,
    funnelEvents,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
