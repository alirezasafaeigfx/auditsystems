# Deployment (No Docker)

AuditSystems is deployed with PM2 and Nginx using immutable timestamped release directories. Docker is not part of the production path.

## Runtime pattern

- Process manager: PM2
- Edge proxy: Nginx
- Release model: `releases/<env>/<release-id>` plus `current/<env>` symlink
- Readiness: `GET /api/ready`
- Health: `GET /api/health`
- Production URL: https://audit.alirezasafaeisystems.ir

## Key files

- `docs/RELEASE_RUNBOOK.md`
- `docs/ROLLBACK_RUNBOOK.md`
- `ops/deploy/deploy.sh`
- `ops/deploy/rollback.sh`
- `scripts/backup-db.sh`
- `scripts/restore-db.sh`
- `scripts/deploy/bootstrap-ubuntu-vps.sh`
- `scripts/deploy/provision-nginx-site.sh`
- `ops/nginx/asdev-audit-ir.conf`

## Server flow

One-time bootstrap:

```bash
sudo bash scripts/deploy/bootstrap-ubuntu-vps.sh
```

Production environment file:

```text
/var/www/asdev-audit-ir/shared/env/production.env
```

Deploy an immutable extracted release:

```bash
bash ops/deploy/deploy.sh \
  --env production \
  --source-dir /path/to/release \
  --release-id <release-id>
```

Roll back to an explicit known-good release:

```bash
bash ops/deploy/rollback.sh \
  --env production \
  --target-release <release-id>
```

No production deployment or rollback may run without explicit owner authorization.

## Active runtime versus repository defaults

Release #103 verified the following active production values:

| Field | Active production |
|---|---|
| Port | `3012` |
| PM2 web | `auditsystems-web` |
| PM2 worker | `auditsystems-worker` |
| Server base | `/var/www/asdev-audit-ir` |

The repository-local `ops/deploy/deploy.sh` and `ops/deploy/rollback.sh` currently default to:

| Environment | Script port | Script PM2 prefix |
|---|---:|---|
| Production | `3010` | `asdev-audit-ir-production-` |
| Staging | `3011` | `asdev-audit-ir-staging-` |

These script defaults are not proof of the active VPS registry. Before deployment or rollback, verify:

- the managed deployment registry;
- Nginx upstream;
- effective PM2 process names;
- host port;
- active symlink;
- deployed SHA/build metadata.

Do not start a second process set or change the active upstream merely to make production match a repository default during a release.

## Shared VPS boundaries

- Production domain: `audit.alirezasafaeisystems.ir`
- Staging domain: `staging.audit.alirezasafaeisystems.ir`
- Environment files remain on the server.
- Releases, logs, backups, and PM2 identities must remain isolated by product and environment.
- DevAtlas and other hold projects are outside the AuditSystems production scope.

For the complete release sequence, use [RELEASE_RUNBOOK.md](RELEASE_RUNBOOK.md). For recovery, use [ROLLBACK_RUNBOOK.md](ROLLBACK_RUNBOOK.md).
