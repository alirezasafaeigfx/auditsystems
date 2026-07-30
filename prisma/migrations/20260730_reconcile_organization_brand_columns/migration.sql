-- Reconcile additive Organization branding fields that exist in Prisma schema
-- and application code but were never represented in migration history.
-- IF NOT EXISTS allows convergence for environments where these nullable
-- columns may already have been added manually.

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "brandName" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "brandLogoBase64" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "secondaryColor" TEXT;
