# AuditSystems Production Release Runbook

**Last reviewed:** 2026-07-16  
**Reference release:** Release #103  
**Production URL:** https://audit.alirezasafaeisystems.ir

This is the canonical AuditSystems release checklist. It supplements the ASDEV mother repository's coordinated release runbook and owns AuditSystems quality gates, database safety, deployment verification, and handoff.

## Production safety boundary

A production release requires:

- a frozen full Git SHA;
- green required CI checks for that SHA;
- a verified backup and rollback target;
- a PostgreSQL rehearsal when database-affecting code changed;
- explicit owner authorization for the exact SHA and UTC window;
- no unresolved release blocker.

Do not expose `DATABASE_URL`, session secrets, payment credentials, Redis credentials, backup contents, or environment files in command output or evidence.

## 1. Freeze and classify the release

Record:

```text
RELEASE_ID=<number>
AUDIT_RELEASE_SHA=<40-char-sha>
PREVIOUS_RELEASE_ID=<known-good-release>
DATABASE_AFFECTING=<yes|no>
SECURITY_AFFECTING=<yes|no>
```

A release is database-affecting when it changes Prisma schema/migrations, database access semantics, backup/restore code, or deployment migration behavior.

Compare the final SHA with the previously rehearsed SHA. If the range changes any database-affecting file, the PostgreSQL rehearsal must be repeated.

## 2. Local and CI gates

Run against the frozen SHA:

```bash
pnpm install --frozen-lockfile
pnpm run scan:secrets
pnpm run check:actions-pinned
pnpm run check
pnpm run payment:preflight:strict
pnpm run deploy:readiness
```

`pnpm run check` includes lint, typecheck, tests, and build. Treat any required CI job that did not receive a runner as an infrastructure blocker, not a pass.

Before the next production release, [Issue #52](https://github.com/alirezasafaei-dev/auditsystems/issues/52) must make database-dump detection per-file and enforce it in required CI. Before the next database-affecting production release, [Issue #55](https://github.com/alirezasafaei-dev/auditsystems/issues/55) must fix remote backup/restore target propagation.

## 3. PostgreSQL rehearsal

Use PostgreSQL 16 disposable source and restore databases. Never target production during rehearsal.

Prove and record:

1. clean migration from an empty database;
2. a second `prisma migrate deploy` is idempotent;
3. backup creation succeeds;
4. backup gzip/dump integrity succeeds;
5. restore into a different disposable database succeeds;
6. migration count and key table count are correct;
7. restored database connectivity succeeds;
8. the source database is unchanged;
9. artifacts and logs contain no secret.

Use the repository scripts with explicit protected PostgreSQL target variables:

```bash
export POSTGRES_HOST='<source-host>'
export POSTGRES_PORT='5432'
export POSTGRES_DB='<source-db>'
export POSTGRES_USER='<source-user>'
export POSTGRES_PASSWORD='<source-password>'
bash scripts/backup-db.sh

export POSTGRES_HOST='<restore-host>'
export POSTGRES_DB='<restore-db>'
export POSTGRES_USER='<restore-user>'
export POSTGRES_PASSWORD='<restore-password>'
bash scripts/restore-db.sh ops/backups/<verified-backup>.sql.gz --force
```

Until [Issue #55](https://github.com/alirezasafaei-dev/auditsystems/issues/55) is fixed and integration-tested, do not rely on `DATABASE_URL` alone for a remote backup or restore target. The current URL mode preserves the database name but does not propagate the full host/user/port/auth target to libpq tools.

Store the evidence SHA-256 and the exact source SHA. Do not commit the database dump.

## 4. Production backup

On the production host, from the frozen release:

```bash
bash scripts/backup-db.sh --dry-run
bash scripts/backup-db.sh
```

For production, use the complete `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` set in protected server environment. Verify the resolved target before running without `--dry-run`. `DATABASE_URL`-only remote targeting is blocked operationally by [Issue #55](https://github.com/alirezasafaei-dev/auditsystems/issues/55).

The script:

- creates `ops/backups/asdev-audit-<timestamp>.sql.gz`;
- verifies file size and gzip integrity;
- logs to `ops/backups/backup.log`;
- applies a 30-day on-disk retention policy.

Record the backup filename, size, SHA-256, and verification result in protected evidence. Do not publish the connection string or dump.

## 5. Owner authorization

For a coordinated ASDEV release, require:

```text
APPROVED_PRODUCTION_RELEASE_<release> audit=<full-audit-sha> mother=<full-mother-sha> window=<UTC> rollback=AUTHORIZED
```

Reject the token if the SHA is abbreviated, the window is missing/expired, or release scope changed after approval.

## 6. Deploy the immutable release

Preferred wrapper from the managed workspace:

```bash
bash scripts/vps-deploy.sh deploy production
```

Portable lower-level entrypoint:

```bash
bash ops/deploy/deploy.sh \
  --env production \
  --source-dir /path/to/extracted-release \
  --release-id <utc-timestamp-and-short-sha>
```

The lower-level script installs locked dependencies, generates Prisma client code, builds before database mutation, runs `prisma migrate deploy`, starts web and worker processes, activates the release symlink, checks readiness, and retains recent releases.

### Runtime registry drift check

Release #103 was verified on the active host with:

| Field | Effective value |
|---|---|
| Host port | `3012` |
| PM2 web | `auditsystems-web` |
| PM2 worker | `auditsystems-worker` |
| Release ID | `20260715T204648Z-d5531254` |

The repository-local lower-level script currently defaults to production port `3010` and PM2 names prefixed with `asdev-audit-ir-production-`. Therefore, before activation, verify the managed VPS registry and Nginx upstream. Do not change the active port or process identity merely to match a script default during a release.

## 7. Verify before declaring success

### Local host

Use the effective host port from the VPS registry:

```bash
curl -fsS "http://127.0.0.1:<effective-port>/api/ready"
curl -fsS "http://127.0.0.1:<effective-port>/api/health"
pm2 list
```

Verify both web and worker are online, stable, and using the expected release directory.

### Public HTTPS

```bash
curl -fsS https://audit.alirezasafaeisystems.ir/api/ready
curl -fsS https://audit.alirezasafaeisystems.ir/api/health
bash scripts/smoke-public-routes.sh https://audit.alirezasafaeisystems.ir
```

Acceptance requires:

- `/api/ready` returns HTTP 200 and reports database and Redis ready;
- `/api/health` returns HTTP 200;
- public route smoke passes;
- active symlink and build/source metadata match the approved SHA;
- the worker remains online and queue backlog does not grow abnormally;
- no new sustained 5xx, authentication, billing, report, or CSRF regression appears.

## 8. Observation and rollback

Keep the previous release and verified backup throughout the observation window. Trigger rollback according to [ROLLBACK_RUNBOOK.md](ROLLBACK_RUNBOOK.md) when a critical acceptance condition fails.

Do not declare success based only on a PM2 `online` state or a single homepage HTTP 200. Readiness, dependencies, immutable identity, worker behavior, and public smoke are all required.

## 9. Terminal report

Record:

```text
STATUS=<DEPLOYED|ROLLED_BACK|BLOCKED>
DEPLOYMENT_TIMESTAMP=<UTC>
AUDIT_RELEASE_SHA=<40-char-sha>
AUDIT_RELEASE_ID=<immutable-id>
PREVIOUS_RELEASE_ID=<rollback-target>
BACKUP_VERIFIED=<yes|no>
PM2_WEB=<name>
PM2_WORKER=<name>
EFFECTIVE_PORT=<port>
READY=<pass|fail>
HEALTH=<pass|fail>
PUBLIC_SMOKE=<pass|fail>
QUEUE=<normal|abnormal|not-verified>
PRODUCTION_MUTATED=<yes|no>
```

Link the coordinated closure report from the mother repository. Release-specific risk acceptances must state their expiry and tracking issue.

## Release #103 note

Release #103 deployed AuditSystems SHA `d55312543ef74b003aeac6aa560980e78b876e57` successfully on 2026-07-15. Its 24-hour admin-session revocation acceptance applies only to that release. [Issue #53](https://github.com/alirezasafaei-dev/auditsystems/issues/53) must be revisited before the next production release.
