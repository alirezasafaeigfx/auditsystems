-- Enforce one durable AUDIT_RUN enqueue per derived idempotency key.
-- Retry jobs intentionally omit idempotencyKey and are not constrained by this index.
CREATE UNIQUE INDEX "Job_audit_enqueue_idempotency_key"
ON "Job" ((payload->>'idempotencyKey'))
WHERE "type" = 'AUDIT_RUN'::"JobType"
  AND payload ? 'idempotencyKey';
