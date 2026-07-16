# AuditSystems Production Rollback Runbook

**Last reviewed:** 2026-07-16  
**Scope:** AuditSystems application and database recovery

Rollback is an incident action, not a substitute for release validation. Prefer the smallest safe rollback: revert the immutable application release first, and restore data only when a confirmed database/data-integrity failure requires it.

## Trigger conditions

Start rollback when one of these conditions is confirmed and persists beyond the normal startup allowance:

- `/api/ready` fails or reports database/Redis unavailable;
- sustained 5xx errors;
- web or worker crash loop;
- abnormal queue backlog growth or report-processing failure;
- critical authentication, CSRF, billing, payment callback, unsubscribe, or report regression;
- active release, symlink, or build metadata does not match the authorized SHA;
- migration or data-integrity failure.

Do not roll back solely because a security-only release has no visible UI change.

## Authority and incident record

Before mutation, record:

```text
INCIDENT_ID=<id>
CURRENT_RELEASE=<id-and-sha>
TARGET_RELEASE=<known-good-id-and-sha>
EFFECTIVE_PORT=<vps-registry-port>
PM2_WEB=<effective-name>
PM2_WORKER=<effective-name>
DATABASE_RESTORE_REQUIRED=<yes|no|undetermined>
BACKUP_FILE=<protected-path-or-id>
ROLLBACK_AUTHORIZED=<yes|no>
```

Release authorization must explicitly include `rollback=AUTHORIZED`, or separate owner authorization is required. Do not publish secrets, database URLs, environment files, or backup contents.

## 1. Stabilize and inspect

1. Confirm public and local readiness failures.
2. Capture the current symlink target, effective PM2 names, port, and recent sanitized logs.
3. Confirm the target release directory and its `ecosystem.config.cjs` exist.
4. Preserve the failed release and logs for investigation.
5. If data integrity is at risk, stop write-producing traffic and the worker before any database recovery.

Useful read-only checks:

```bash
readlink -f /var/www/asdev-audit-ir/current/production
pm2 list
curl -fsS "http://127.0.0.1:<effective-port>/api/ready"
curl -fsS https://audit.alirezasafaeisystems.ir/api/ready
```

## 2. Application rollback

The repository rollback entrypoint is:

```bash
bash ops/deploy/rollback.sh \
  --env production \
  --target-release <known-good-release-id>
```

When `--target-release` is omitted, the script selects the newest release other than the current symlink target. For production incidents, prefer an explicit verified target.

### Runtime registry warning

The repository script defaults to port `3010` and PM2 names prefixed with `asdev-audit-ir-production-`. Release #103's active host was verified on port `3012` with `auditsystems-web` and `auditsystems-worker`.

Before running the script, reconcile the managed VPS registry, Nginx upstream, PM2 identity, and script arguments/configuration. If they differ, use the server's approved managed rollback entrypoint or pass the correct supported base/app configuration. Do not allow a rollback to start duplicate processes or health-check the wrong port.

## 3. Verify application rollback

Use the effective host port:

```bash
curl -fsS "http://127.0.0.1:<effective-port>/api/ready"
curl -fsS "http://127.0.0.1:<effective-port>/api/health"
curl -fsS https://audit.alirezasafaeisystems.ir/api/ready
curl -fsS https://audit.alirezasafaeisystems.ir/api/health
bash scripts/smoke-public-routes.sh https://audit.alirezasafaeisystems.ir
pm2 list
```

Confirm:

- current symlink points to the intended known-good release;
- deployed source/build metadata matches the rollback target SHA;
- web and worker are online and stable;
- readiness reports database and Redis ready;
- queue behavior returns to normal;
- public smoke passes;
- error rate returns to baseline.

If application rollback restores service and no data integrity issue exists, do not restore the database.

## 4. Database restore — only when required

Database restore is destructive. It requires explicit confirmation of:

- a verified pre-release backup;
- the exact target database;
- acceptable data-loss window;
- application writes and worker activity stopped;
- owner authorization for restore;
- a post-restore validation plan.

Use a protected complete `DATABASE_URL` or explicit `POSTGRES_*` variables for the restore target.

```bash
export DATABASE_URL='<complete-target-url>'

# Validate without mutation
bash scripts/restore-db.sh ops/backups/<verified-backup>.sql.gz --dry-run

# Restore only after authorization
bash scripts/restore-db.sh ops/backups/<verified-backup>.sql.gz --force
```

The resolver passes the complete host, port, decoded user/password, database, and supported SSL settings to libpq without placing credentials in process arguments. Verify the sanitized target printed by the dry run before the destructive command. The restore script verifies gzip/dump structure, uses `ON_ERROR_STOP` and a single transaction for SQL gzip backups, checks key tables, and verifies connectivity.

Never improvise a production down migration. Prisma migrations are normally forward-only; if a schema correction can be safely shipped forward, prefer an emergency fix release over restoring production data.

## 5. Post-restore validation

After a database restore:

1. verify table and migration counts;
2. verify database connectivity;
3. run `/api/ready` and `/api/health`;
4. restart the approved web and worker processes with the known-good release;
5. verify authentication, a representative audit/report flow, and queue processing;
6. run public smoke;
7. confirm the restored point and any data-loss interval with the owner.

## 6. Terminal report

Record:

```text
STATUS=<ROLLED_BACK|RECOVERED|ROLLBACK_FAILED>
INCIDENT_ID=<id>
TIMESTAMP=<UTC>
FROM_RELEASE=<id-and-sha>
TO_RELEASE=<id-and-sha>
DATABASE_RESTORED=<yes|no>
BACKUP_VERIFIED=<yes|no|not-applicable>
READY=<pass|fail>
HEALTH=<pass|fail>
PUBLIC_SMOKE=<pass|fail>
WORKER_QUEUE=<normal|abnormal|not-verified>
DATA_LOSS_WINDOW=<none|duration|unknown>
FOLLOW_UP_ISSUE=<url>
```

Open an incident follow-up for root cause, corrective action, and regression coverage. Do not delete failed release directories, logs, or backups until the incident is closed and retention policy permits it.
