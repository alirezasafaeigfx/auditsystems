# Backup and Rollback Guide — Sprint 2

**Date**: 2026-07-04
**Deployed Commit**: `5835f81`
**Backup Location**: `~/backups/auditsystems/20260704-215759/` (production server)

---

## Database Backup & Restore

### Backup (already taken)

```bash
# Backup location on production
~/backups/auditsystems/20260704-215759/
```

### Restore from backup

```bash
# Stop the app first
pm2 stop auditsystems

# Restore database
pg_restore --clean --if-exists -d auditsystems ~/backups/auditsystems/20260704-215759/auditsystems.dump

# Restart the app
pm2 start auditsystems
```

### Create a new backup before rollback

```bash
pg_dump --format=custom auditsystems > ~/backups/auditsystems/$(date +%Y%m%d-%H%M%S)/auditsystems.dump
```

---

## Code Rollback

### Rollback to Sprint 1 baseline

```bash
# On production server
cd /home/dev13/my-project/sites/live/auditsystems

# Stash any uncommitted changes
git stash

# Rollback to the deployed commit
git checkout 5835f81

# Reinstall dependencies
pnpm install

# Rebuild
pnpm build

# Regenerate Prisma client
pnpm db:generate

# Restart
pm2 restart auditsystems
```

### Rollback to pre-Sprint-2 (if needed)

```bash
# Find the commit before Sprint 2
git log --oneline | head -10

# Checkout that commit
git checkout <commit-hash>

# Rebuild and restart
pnpm install && pnpm build && pnpm db:generate && pm2 restart auditsystems
```

---

## PM2 / start.sh Behavior

### PM2 commands

```bash
# Check status
pm2 status

# View logs
pm2 logs auditsystems --lines 100

# Restart
pm2 restart auditsystems

# Stop
pm2 stop auditsystems
```

### start.sh behavior

- `start.sh` runs `pnpm build && pnpm db:generate && node .next/standalone/server.js`
- PM2 runs `start.sh` as the entry point
- On crash, PM2 auto-restarts (check `pm2 status` for restart count)
- Logs are at `~/.pm2/logs/auditsystems-*.log`

---

## Shared Environment Loading

- `.env` is loaded by Next.js at build time AND runtime
- `.env` must contain: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- Never commit `.env` — it contains secrets
- Use `.env.example` as a template for new environments

### Environment variables checklist

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Random string for session encryption |
| `NEXTAUTH_URL` | Yes | Base URL of the application |
| `CSRF_SECRET` | Yes | Used for CSRF token generation |

---

## Health Checks

### Quick health check

```bash
# Check if app is responding
curl -s -o /dev/null -w "%{http_code}" https://audit.alirezasafaeisystems.ir/

# Check API readiness
curl -s https://audit.alirezasafaeisystems.ir/api/ready
```

### Full health check

```bash
# Run the smoke test script
./scripts/smoke-public-routes.sh
```

---

## Route Smoke Checks

After deployment or rollback, verify these routes:

| Route | Expected | Description |
|-------|----------|-------------|
| `/` | 200 | Homepage |
| `/signup` | 200 | Signup page |
| `/login` | 200 | Login page |
| `/app` | 307 | Redirects to login (if not authenticated) |
| `/api/csrf` | 200 | Returns CSRF token |
| `/audit` | 200 | Audit page |
| `/pricing` | 200 | Pricing page |
| `/api/ready` | 200 | Health check endpoint |

---

## Migration Safety

### Before running migrations

1. **Always take a backup first**
2. Check migration status: `npx prisma migrate status`
3. Review the migration SQL before applying
4. Test in development first

### Running migrations

```bash
# Apply pending migrations
pnpm db:migrate

# Or generate only (if schema changed but no migration needed)
pnpm db:generate
```

### If migration fails

1. Check the error message
2. Review the migration file in `prisma/migrations/`
3. Fix the issue
4. Re-run `pnpm db:migrate`

---

## What to Do If...

### `/app` fails (500 or blank)

1. Check PM2 logs: `pm2 logs auditsystems --lines 50`
2. Check if database is accessible
3. Verify `DATABASE_URL` in `.env`
4. Try: `pm2 restart auditsystems`

### `/api/csrf` fails

1. Check if the app is running
2. Verify `CSRF_SECRET` is set in `.env`
3. Check PM2 logs for errors
4. Try: `pm2 restart auditsystems`

### Login/Signup fails

1. Check PM2 logs for auth errors
2. Verify `NEXTAUTH_SECRET` is set
3. Verify database connection
4. Check if user table exists and has correct schema
5. Try: `pm2 restart auditsystems`

### Build fails after rollback

1. Clear build cache: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules && pnpm install`
3. Regenerate Prisma client: `pnpm db:generate`
4. Rebuild: `pnpm build`

---

## What Must Never Be Committed

- `.env` files (contain secrets)
- `node_modules/` directory
- `.next/` build output
- Database backups (`*.dump`, `*.sql`)
- `~/.pm2/` logs
- `NEXTAUTH_SECRET`, `DATABASE_URL`, or any credentials
- API keys or tokens

---

## Emergency Rollback Checklist

1. [ ] Stop the app: `pm2 stop auditsystems`
2. [ ] Take a backup of current state
3. [ ] Rollback code: `git checkout <known-good-commit>`
4. [ ] Restore database if needed (see Database Restore above)
5. [ ] Rebuild: `pnpm install && pnpm build && pnpm db:generate`
6. [ ] Restart: `pm2 start auditsystems`
7. [ ] Run smoke tests: `./scripts/smoke-public-routes.sh`
8. [ ] Verify all routes work
9. [ ] Notify team of rollback
