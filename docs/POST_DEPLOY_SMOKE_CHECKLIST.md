# Post-Deploy Smoke Checklist

**Purpose**: Verify app health after deployment
**Run after**: Every deployment, rollback, or database migration

---

## Prerequisites

- App is running: `pm2 status`
- Database is accessible
- Environment variables are set

---

## 1. Route Checks

### Public Routes

| Route | Expected | Method | Description |
|-------|----------|--------|-------------|
| `/` | 200 | GET | Homepage loads |
| `/signup` | 200 | GET | Signup page loads |
| `/login` | 200 | GET | Login page loads |
| `/app` | 307 | GET | Redirects to login (unauthenticated) |
| `/audit` | 200 | GET | Audit page loads |
| `/pricing` | 200 | GET | Pricing page loads |

### API Routes

| Route | Expected | Method | Description |
|-------|----------|--------|-------------|
| `/api/csrf` | 200 | GET | Returns CSRF token |
| `/api/ready` | 200 | GET | Health check endpoint |

### Manual verification

```bash
# Run automated smoke tests
./scripts/smoke-public-routes.sh
```

---

## 2. CSRF Verification

1. Call `/api/csrf` and verify response contains a token
2. Use the token in subsequent API requests
3. Verify that requests without CSRF token are rejected

```bash
# Get CSRF token
curl -s https://audit.alirezasafaeisystems.ir/api/csrf

# Expected: JSON with csrfToken field
```

---

## 3. Session Verification

1. Navigate to `/login` and verify page loads
2. Attempt login with test credentials
3. Verify redirect to `/app` after successful login
4. Check that session is maintained across page reloads
5. Verify logout works and redirects to `/login`

---

## 4. Database Verification

```bash
# Check database connection
npx prisma db push --preview-feature

# Verify migration status
npx prisma migrate status
```

---

## 5. Build Verification

```bash
# Check build output exists
ls -la .next/standalone/server.js

# Verify Prisma client is generated
ls -la node_modules/.prisma/client/
```

---

## 6. PM2 Verification

```bash
# Check PM2 status
pm2 status

# Check for errors in logs
pm2 logs auditsystems --lines 20 --err

# Verify restart count is 0 (no crashes)
pm2 show auditsystems | grep "restart"
```

---

## Quick Smoke Test Script

```bash
# Run all checks
./scripts/smoke-public-routes.sh

# Expected output: all PASS
```

---

## Failure Handling

If any check fails:

1. Check PM2 logs: `pm2 logs auditsystems --lines 100`
2. Verify environment variables in `.env`
3. Check database connectivity
4. Try restarting: `pm2 restart auditsystems`
5. If persistent, rollback to previous version (see BACKUP_AND_ROLLBACK_SPRINT_2.md)

---

## Sign-off

- [ ] All public routes return expected status codes
- [ ] CSRF token generation works
- [ ] Login/Signup functionality works
- [ ] Session management works
- [ ] Database is accessible
- [ ] PM2 is running without errors
- [ ] No errors in logs
