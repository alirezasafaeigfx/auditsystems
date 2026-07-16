# Admin Panel Setup Guide

## Environment Variables

Add these to your `.env` file:

```bash
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your-secure-password-here"
ADMIN_SESSION_SECRET="random-32-byte-or-longer-secret"
```

Generate the signing secret with:

```bash
openssl rand -hex 32
```

`ADMIN_SESSION_SECRET` is enforced at a minimum of 32 UTF-8 bytes; shorter or missing values fail authentication closed. Keep it stable across normal deploys. Rotating it is an emergency revoke-all mechanism and immediately invalidates every existing admin cookie.

## Database Migration

Admin authentication uses the `AdminSession` table for server-side expiry and revocation. Apply the checked-in Prisma migration through the normal release rehearsal and deployment workflow before starting the new application release:

```bash
pnpm prisma migrate deploy
```

Do not use `prisma db push` in staging or production.

## Access Admin Panel

1. Navigate to `https://audit.alirezasafaeisystems.ir/admin/login`.
2. Enter the configured username and password.
3. Access the dashboard at `/admin`.

## Session Security Model

- Session cookies are HMAC-signed, `httpOnly`, `sameSite=lax`, and `secure` in production.
- Only a SHA-256 token hash is stored in PostgreSQL; raw cookies and signing secrets are never stored.
- Sessions expire after 24 hours.
- Every authenticated request requires a matching, active, non-revoked database record.
- Logout revokes the current server-side session before deleting its cookie.
- Admin login, logout, individual revoke, and revoke-all operations require CSRF validation. Login attempts are rate-limited by client IP.
- A database outage fails authentication and session creation closed.
- Rotating `ADMIN_SESSION_SECRET` invalidates all cookies, including records not yet marked revoked.

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/admin/auth/login` | Validate credentials and create a persisted session |
| `POST` | `/api/admin/auth/logout` | Revoke the current session and clear its cookie |
| `GET` | `/api/admin/auth/sessions` | List active sessions without exposing token hashes |
| `DELETE` | `/api/admin/auth/sessions` | Revoke one session using JSON `{"sessionId":"<uuid>"}` |
| `POST` | `/api/admin/auth/sessions/revoke-all` | Revoke every active session |
| `GET` | `/api/admin/stats` | Get dashboard statistics |

Login, logout, individual revoke, and revoke-all requests must use the existing CSRF header helper.

## Incident Response

1. For one suspected device, list active sessions and revoke its session ID.
2. If the affected session cannot be identified, use the authenticated revoke-all endpoint.
3. If database-backed revocation is unavailable or signing-key compromise is suspected, rotate `ADMIN_SESSION_SECRET`, restart all application processes, and require every administrator to sign in again.
4. Record the action and exact deployment/migration evidence in the release report.

## Release Verification

Before merging or deploying changes to session authentication:

- run lint, typecheck, unit tests, and build;
- rehearse the Prisma migration against disposable PostgreSQL 16 databases;
- verify login, authenticated access, individual revoke, revoke-all, logout, expiry, replay rejection, and signing-secret rotation;
- verify no cookie, password, signing secret, or token hash appears in logs or API responses.
