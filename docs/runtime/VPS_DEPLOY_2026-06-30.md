# VPS Deploy Record

Date: 2026-06-30

## Summary
- Production deploy was executed from the project-local entrypoint: `bash scripts/vps-deploy.sh deploy production`
- Release path: `/var/www/asdev-audit-ir/releases/production/20260630T161015Z-root`
- PM2 processes:
  - `asdev-audit-ir-production-web`
  - `asdev-audit-ir-production-worker`
- Local readiness: `http://127.0.0.1:3010/api/ready`
- Public readiness: `https://audit.alirezasafaeisystems.ir/api/ready`

## Recovery Work Completed
- Rebuilt the missing production env on the VPS at `/var/www/asdev-audit-ir/shared/env/production.env`
- Recreated the production PostgreSQL database and credentials on the VPS
- Restored a missing Prisma migration file so release migrations could run cleanly
- Corrected rollback process naming so rollback manages both web and worker apps

## Isolated Runtime Contract
- Base dir: `/var/www/asdev-audit-ir`
- Shared env: `/var/www/asdev-audit-ir/shared/env/production.env`
- Shared logs: `/var/www/asdev-audit-ir/shared/logs/`
- Current symlink: `/var/www/asdev-audit-ir/current/production`
- Production port: `127.0.0.1:3010`
- Staging port reservation: `127.0.0.1:3011`

## Notes
- This project is now live again and isolated from `persiantoolbox` and `alirezasafaeisystems`.
- Full end-to-end submission smoke still needs a CSRF-aware test helper; readiness and public availability are already verified.
