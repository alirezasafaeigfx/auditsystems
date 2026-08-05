-- Enforce one active payment checkout per report run, normalized email, and provider.
-- The partial uniqueness matches the order lifecycle: PAID orders are reused,
-- while FAILED/CANCELED/EXPIRED orders no longer block a new attempt.
--
-- Existing duplicate pending rows are not deleted or guessed. Migration stops
-- with an actionable error so an owner can reconcile production data explicitly.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "AuditOrder"
        WHERE "status" = 'PENDING'
        GROUP BY "runId", "email", "provider"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'DUPLICATE_PENDING_AUDIT_ORDERS_REQUIRE_RECONCILIATION';
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "AuditOrder_one_pending_checkout_key"
    ON "AuditOrder"("runId", "email", "provider")
    WHERE "status" = 'PENDING';
