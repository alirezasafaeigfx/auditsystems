-- Upgrade LeadStatus enum from lifecycle-v1 (CALL/PROPOSAL/WON) to lifecycle-v2 (AUDIT_STARTED/REPORT_READY/DELIVERED/CONVERTED)
-- and convert one-to-one AuditLead→AuditOrder relation to one-to-many.

-- 1. Drop default so we can alter the enum type
ALTER TABLE "AuditLead" ALTER COLUMN "status" DROP DEFAULT;

-- 2. Create new enum type
CREATE TYPE "LeadStatus_new" AS ENUM ('NEW', 'QUALIFIED', 'AUDIT_STARTED', 'REPORT_READY', 'DELIVERED', 'CONVERTED', 'LOST');

-- 3. Map old enum values to new ones
UPDATE "AuditLead" SET "status" = CASE "status"
  WHEN 'CALL'     THEN 'QUALIFIED'
  WHEN 'PROPOSAL' THEN 'DELIVERED'
  WHEN 'WON'      THEN 'CONVERTED'
  ELSE "status"::text
END
WHERE "status" IN ('CALL', 'PROPOSAL', 'WON');

-- 4. Cast column to new enum type
ALTER TABLE "AuditLead" ALTER COLUMN "status" TYPE "LeadStatus_new" USING "status"::text::"LeadStatus_new";

-- 5. Drop old enum and rename new one
DROP TYPE "LeadStatus";
ALTER TYPE "LeadStatus_new" RENAME TO "LeadStatus";

-- 6. Re-add default
ALTER TABLE "AuditLead" ALTER COLUMN "status" SET DEFAULT 'NEW';

-- 7. Rename wonAt → convertedAt
ALTER TABLE "AuditLead" ADD COLUMN "convertedAt" TIMESTAMP(3);
UPDATE "AuditLead" SET "convertedAt" = "wonAt" WHERE "wonAt" IS NOT NULL;
ALTER TABLE "AuditLead" DROP COLUMN "wonAt";

-- 8. Remove unique constraint on AuditOrder.leadId (enabling one-to-many)
ALTER TABLE "AuditOrder" DROP CONSTRAINT IF EXISTS "AuditOrder_leadId_key";
