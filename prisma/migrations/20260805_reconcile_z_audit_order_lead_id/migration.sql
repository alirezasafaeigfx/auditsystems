-- Reconcile the nullable AuditOrder -> AuditLead relation declared by Prisma.
--
-- Earlier lead-lifecycle migrations removed a legacy uniqueness constraint but
-- never created the leadId column on fresh databases. This migration is
-- intentionally forward-only and non-destructive: it does not infer, backfill,
-- delete, or rewrite any existing order or lead data.

ALTER TABLE "AuditOrder"
    ADD COLUMN IF NOT EXISTS "leadId" TEXT;

CREATE INDEX IF NOT EXISTS "AuditOrder_leadId_idx"
    ON "AuditOrder"("leadId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint constraint_row
        JOIN pg_class source_table
          ON source_table.oid = constraint_row.conrelid
        JOIN pg_namespace source_schema
          ON source_schema.oid = source_table.relnamespace
        JOIN pg_class target_table
          ON target_table.oid = constraint_row.confrelid
        JOIN pg_attribute source_column
          ON source_column.attrelid = constraint_row.conrelid
         AND source_column.attnum = ANY (constraint_row.conkey)
        WHERE constraint_row.contype = 'f'
          AND source_schema.nspname = current_schema()
          AND source_table.relname = 'AuditOrder'
          AND target_table.relname = 'AuditLead'
          AND source_column.attname = 'leadId'
    ) THEN
        ALTER TABLE "AuditOrder"
            ADD CONSTRAINT "AuditOrder_leadId_fkey"
            FOREIGN KEY ("leadId")
            REFERENCES "AuditLead"("id")
            ON DELETE SET NULL
            ON UPDATE CASCADE;
    END IF;
END
$$;
