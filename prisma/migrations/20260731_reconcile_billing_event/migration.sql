-- Reconcile Prisma schema with the deployed migration chain.
-- BillingEvent is referenced by production code and present in schema.prisma,
-- but no prior migration created the table. This migration is additive and
-- safe for environments where the table or indexes were created manually.

CREATE TABLE IF NOT EXISTS "BillingEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actor" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BillingEvent_organizationId_createdAt_idx"
    ON "BillingEvent"("organizationId", "createdAt");

CREATE INDEX IF NOT EXISTS "BillingEvent_organizationId_eventType_idx"
    ON "BillingEvent"("organizationId", "eventType");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'BillingEvent_organizationId_fkey'
          AND conrelid = '"BillingEvent"'::regclass
    ) THEN
        ALTER TABLE "BillingEvent"
            ADD CONSTRAINT "BillingEvent_organizationId_fkey"
            FOREIGN KEY ("organizationId")
            REFERENCES "Organization"("id")
            ON DELETE RESTRICT
            ON UPDATE CASCADE;
    END IF;
END
$$;
