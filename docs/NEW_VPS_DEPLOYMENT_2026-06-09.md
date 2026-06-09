# New VPS Deployment Record

Date: 2026-06-09

## Project Boundary
- Local project: `sites/live/auditsystems`
- Public URL: `https://audit.alirezasafaeisystems.ir/`
- Server release path: `/var/www/asdev-audit-ir/releases/production/20260609T175200Z-local-latest`
- Shared env path: `/var/www/asdev-audit-ir/shared/env/production.env`
- Database credential file on VPS: `/etc/asdev-audit-ir/credentials.env`
- Web PM2 process: `asdev-audit-ir-production-web`
- Worker PM2 process: `asdev-audit-ir-production-worker`
- Web listener: `127.0.0.1:3010`

## Current Production State
- The project is deployed independently on the new VPS under the audit subdomain.
- Web and worker processes are separate PM2 apps.
- PostgreSQL is available locally on the VPS at `127.0.0.1:5432`.
- Production database name recorded for operations: `asdev_audit_production`.

## Validation
| Check | Last recorded result |
|---|---|
| `https://audit.alirezasafaeisystems.ir/` | `200` |
| `https://audit.alirezasafaeisystems.ir/api/ready` | `200` |

## Safe Operational Commands
- Process list: `pm2 list`
- Web details: `pm2 show asdev-audit-ir-production-web`
- Worker details: `pm2 show asdev-audit-ir-production-worker`
- Local readiness on VPS: `curl -fsS http://127.0.0.1:3010/api/ready`
- Public readiness: `curl -fsS https://audit.alirezasafaeisystems.ir/api/ready`
- PostgreSQL listener check: `ss -ltnp | grep ':5432'`

## Deployment Notes
- Release identifier: `20260609T175200Z-local-latest`
- GitHub sync timed out from this environment during deployment attempts.
- The active production release was deployed from latest local code, not from an old Codex snapshot.
- Keep this app, worker, database, env file, and release tree separate from the other two live projects.

## Security Notes
- Do not print or commit `/var/www/asdev-audit-ir/shared/env/production.env`.
- Do not print or commit `/etc/asdev-audit-ir/credentials.env`.
- Do not document secret values, database URLs, API tokens, admin passwords, session secrets, or payment credentials.
