# VPS Deploy Record

Date: 2026-07-05

## Summary
- Production deploy executed via `pnpm run vps:deploy production`
- Release path: `/var/www/asdev-audit-ir/releases/production/20260705T134450Z-root`
- PM2 processes:
  - `asdev-audit-ir-production-web` (id 33, pid 613452)
  - `asdev-audit-ir-production-worker` (id 34, pid 613453)
- Local readiness: `http://127.0.0.1:3010/api/ready`
- Public readiness: `https://audit.alirezasafaeisystems.ir/api/ready`

## Bugs Fixed

### 1. Missing dependencies in package.json
- **Root cause**: Commit `ecf7d4d` accidentally deleted `dependencies` and `devDependencies` sections from `package.json`
- **Impact**: `pnpm install --frozen-lockfile` on VPS installed zero packages, causing `prisma` command not found and styles not loading
- **Fix**: Restored all dependencies and added `pnpm.onlyBuiltDependencies` for build scripts

### 2. Missing static file copy for standalone mode
- **Root cause**: `ops/deploy/deploy.sh` ran `pnpm run build` but did not copy `.next/static` and `public/` into `.next/standalone/`
- **Impact**: Next.js standalone server could not serve CSS/JS/fonts — styles were broken
- **Fix**: Added `cp -r .next/static .next/standalone/.next/` and `cp -r public .next/standalone/` after build

### 3. PM2 script path not absolute
- **Root cause**: Ecosystem config used `script: 'node'` which PM2 couldn't resolve in PATH
- **Impact**: PM2 tried to execute `server.js` as a shell script, causing syntax errors
- **Fix**: Use `$(command -v node)` to embed absolute path (`/usr/bin/node`)

### 4. PM2 startOrReload not updating script
- **Root cause**: `pm2 startOrReload` only reloads env vars, not the `script` field of existing processes
- **Impact**: Old process config with `script: 'node'` persisted even after ecosystem config was updated
- **Fix**: Changed to `pm2 delete` + `pm2 start` pattern, and source env file before starting

## Verification
- All public routes return 200 (/, /login, /signup, /pricing)
- CSS stylesheet loads correctly (Vazirmatn + IRANSansX fonts)
- `/api/ready` returns 200 with database and Redis pass
- PM2 processes online with 0 restarts
- Other sites (persiantoolbox, portfolio, devatlas) unaffected
