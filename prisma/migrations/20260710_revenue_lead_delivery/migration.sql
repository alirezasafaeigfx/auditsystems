CREATE TYPE "AuditReportStatus" AS ENUM ('QUEUED', 'RUNNING', 'REVIEW', 'DELIVERED', 'FAILED');
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'QUALIFIED', 'CALL', 'PROPOSAL', 'WON', 'LOST');

ALTER TABLE "AuditRun"
ADD COLUMN "reportStatus" "AuditReportStatus" NOT NULL DEFAULT 'QUEUED';

ALTER TABLE "ReportShare"
ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastViewedAt" TIMESTAMP(3),
ADD COLUMN "passwordHash" TEXT;

ALTER TABLE "AuditLead"
ADD COLUMN "domain" TEXT,
ADD COLUMN "normalizedUrl" TEXT,
ADD COLUMN "businessType" TEXT,
ADD COLUMN "primaryConcern" TEXT,
ADD COLUMN "consentPrivacy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN "internalNote" TEXT,
ADD COLUMN "nextActionAt" TIMESTAMP(3),
ADD COLUMN "lostReason" TEXT,
ADD COLUMN "leadSource" TEXT NOT NULL DEFAULT 'direct',
ADD COLUMN "sourcePlacement" TEXT,
ADD COLUMN "sourceOffer" TEXT,
ADD COLUMN "submitEventId" TEXT,
ADD COLUMN "qualifiedAt" TIMESTAMP(3),
ADD COLUMN "wonAt" TIMESTAMP(3),
ADD COLUMN "lostAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "AuditLead" l
SET
  "domain" = COALESCE(r."normalizedUrl", r."url", 'unknown.invalid'),
  "businessType" = 'unknown',
  "primaryConcern" = COALESCE(l."note", 'Legacy lead captured before qualification fields were added'),
  "consentPrivacy" = false
FROM "AuditRun" r
WHERE l."runId" = r."id";

UPDATE "AuditLead"
SET
  "domain" = COALESCE("domain", 'unknown.invalid'),
  "businessType" = COALESCE("businessType", 'unknown'),
  "primaryConcern" = COALESCE("primaryConcern", 'Legacy lead captured before qualification fields were added');

ALTER TABLE "AuditLead"
ALTER COLUMN "domain" SET NOT NULL,
ALTER COLUMN "businessType" SET NOT NULL,
ALTER COLUMN "primaryConcern" SET NOT NULL,
ALTER COLUMN "runId" DROP NOT NULL;

ALTER TABLE "AuditLead" DROP CONSTRAINT "AuditLead_runId_fkey";
ALTER TABLE "AuditLead"
ADD CONSTRAINT "AuditLead_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AuditRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AuditLead_domain_createdAt_idx" ON "AuditLead"("domain", "createdAt");
CREATE INDEX "AuditLead_status_createdAt_idx" ON "AuditLead"("status", "createdAt");
CREATE INDEX "AuditLead_leadSource_createdAt_idx" ON "AuditLead"("leadSource", "createdAt");

CREATE TABLE "FunnelEvent" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "leadId" TEXT,
  "runId" TEXT,
  "source" TEXT,
  "placement" TEXT,
  "offer" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FunnelEvent_eventType_createdAt_idx" ON "FunnelEvent"("eventType", "createdAt");
CREATE INDEX "FunnelEvent_leadId_createdAt_idx" ON "FunnelEvent"("leadId", "createdAt");
CREATE INDEX "FunnelEvent_runId_createdAt_idx" ON "FunnelEvent"("runId", "createdAt");
CREATE INDEX "FunnelEvent_source_createdAt_idx" ON "FunnelEvent"("source", "createdAt");

ALTER TABLE "FunnelEvent"
ADD CONSTRAINT "FunnelEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "AuditLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FunnelEvent"
ADD CONSTRAINT "FunnelEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AuditRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
