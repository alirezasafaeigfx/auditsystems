# Admin Session PostgreSQL 16 Rehearsal — Issue #60

Date: 2026-07-16T07:30:00Z
SHA: fc9e2ee4ba363f8d15638a7148ab7b1505eba041
Host: AUTOMATION_SERVER

## Versions
- node: v22.16.0
- pnpm: 9.15.0
- PostgreSQL: 16.14
- pg_dump: 16.14
- psql: 16.14

## Disposable Databases
- SOURCE_DB: issue60_src_1784186633 (disposable=yes)
- RESTORE_DB: issue60_rst_1784186633 (disposable=yes)

## Migration Results
- First migration: PASS (8 migrations applied)
- Second migration: PASS (idempotent, no pending)

## AdminSession Verification
- Table exists: YES
- Columns: id (PK), tokenHash (unique), createdAt, expiresAt, revokedAt, lastSeenAt
- Indexes: 4 (PK, unique tokenHash, expiresAt, composite revokedAt+expiresAt)
- Tables: 22, Migrations: 8

## Backup/Restore
- Backup: PASS (SHA-256: 956d1bd7cf82069e43bf67255b6d239e7750b3f66c8d7b48d0c17cb66968f5cf)
- Restore: PASS (22 tables, 8 migrations, 4 AdminSession indexes)
- Source unchanged: PASS

## Secret Scan
- No secrets in logs or artifacts
- Dump: DISPOSABLE_SECRET_FREE

## Verdict: PASS
