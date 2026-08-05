-- Reconcile Prisma schema with the deployed migration chain.
-- A clean `prisma migrate deploy` previously omitted the User referral fields
-- and the entire TeamMemberInvite table even though both are used by the
-- generated client and application code. This migration is additive.
--
-- If an environment contains a manually-created but structurally incomplete
-- TeamMemberInvite table, subsequent index/constraint statements fail closed
-- rather than silently accepting a partial schema.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredBy" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode");

CREATE TABLE IF NOT EXISTS "TeamMemberInvite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "tokenHash" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMemberInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeamMemberInvite_tokenHash_key"
    ON "TeamMemberInvite"("tokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "TeamMemberInvite_organizationId_email_key"
    ON "TeamMemberInvite"("organizationId", "email");
CREATE INDEX IF NOT EXISTS "TeamMemberInvite_organizationId_idx"
    ON "TeamMemberInvite"("organizationId");
CREATE INDEX IF NOT EXISTS "TeamMemberInvite_tokenHash_idx"
    ON "TeamMemberInvite"("tokenHash");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'TeamMemberInvite_organizationId_fkey'
          AND conrelid = '"TeamMemberInvite"'::regclass
    ) THEN
        ALTER TABLE "TeamMemberInvite"
            ADD CONSTRAINT "TeamMemberInvite_organizationId_fkey"
            FOREIGN KEY ("organizationId")
            REFERENCES "Organization"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'TeamMemberInvite_invitedById_fkey'
          AND conrelid = '"TeamMemberInvite"'::regclass
    ) THEN
        ALTER TABLE "TeamMemberInvite"
            ADD CONSTRAINT "TeamMemberInvite_invitedById_fkey"
            FOREIGN KEY ("invitedById")
            REFERENCES "User"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    END IF;
END
$$;
