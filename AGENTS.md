# Agent Governance - AuditSystems

**Last Updated**: 2026-07-24
**Status**: Active
**Latest Release**: `20260724T160226Z-a68b06d`
**Production**: https://audit.alirezasafaeisystems.ir/

---

## Agent Guidelines

### Agent Working Directory
- **Base Path**: `/home/dev13/alirezasafaeisystems/sites/auditsystems-ri`
- **Allowed Directories**: `src/`, `scripts/`, `docs/`, `prisma/`
- **Restricted Directories**: `.git/`, `node_modules/`, `.next/`, `worktrees/`

### Key Constraints
- No global installs — project-local dependencies only
- All changes must pass `pnpm check` (lint + typecheck + test + build)
- TypeScript strict — no explicit `any` except documented boundary
- No hardcoded secrets — use environment variables
- No direct commits to `main` — use feature branches
- Conventional commit messages required

---

## Decision Rules

### Autonomous Execution
- Execute until blocked by external factors (credentials, DNS, payment sandbox)
- Do not ask "should I continue?" or "is this OK?"
- When blocked 3x with valid methods, log as BLOCKED and move on

### Quality Gates Before PR
```
pnpm check:no-database-dumps
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm scan:secrets
pnpm check:actions-pinned
pnpm smoke:routes
```

---

## Architecture

### Tech Stack
- **Framework**: Next.js 16.2.10 (App Router, Turbopack)
- **Language**: TypeScript 6.0.3 (strict)
- **Database**: PostgreSQL 16 + Prisma 6.19.3
- **Runtime**: Node.js 20.20.2
- **Package Manager**: pnpm 9.15.0
- **Testing**: Vitest 4.1.9
- **Styling**: Custom CSS with CSS variables (no Tailwind in production)
- **PDF**: pdf-lib
- **HTML Parsing**: Cheerio

### Production Server
- **Host**: `ubuntu@193.93.169.32` (Iran)
- **Port**: 3012 (nginx proxies from 443)
- **PM2 Processes**: `auditsystems-web`, `auditsystems-worker`
- **Release Path**: `/var/www/asdev-audit-ir/releases/production/<release-id>/`
- **Symlink**: `/var/www/asdev-audit-ir/current/production`

### Deployment
```bash
# Local: create tarball
git archive --format=tar.gz --prefix=release/ HEAD > /tmp/release.tar.gz

# Upload and deploy
scp /tmp/release.tar.gz ubuntu@193.93.169.32:/tmp/
ssh ubuntu@193.93.169.32 "bash deploy.sh <release-id>"

# Or manual:
ssh ubuntu@193.93.169.32
mkdir -p /var/www/asdev-audit-ir/releases/production/<release-id>
cd /var/www/asdev-audit-ir/releases/production/<release-id>
tar xzf /tmp/release.tar.gz --strip-components=1
cp /var/www/asdev-audit-ir/releases/production/<previous>/.env .
pnpm install --frozen-lockfile
pnpm run build
npx prisma migrate deploy
ln -sfn $(pwd) /var/www/asdev-audit-ir/current/production
pm2 delete auditsystems-web; pm2 delete auditsystems-worker
pm2 start node_modules/next/dist/bin/next --name auditsystems-web -- start -p 3012
pm2 start node_modules/tsx/dist/cli.mjs --name auditsystems-worker -- src/worker/index.ts
pm2 save
```

### CRITICAL: PM2 Commands
- **NEVER** use `pm2 update` — it stops ALL processes across all apps
- **ALWAYS** use targeted `pm2 delete <name>` + `pmpm2 start`
- **NEVER** use `node node_modules/.bin/next` — it's a shell wrapper
- **ALWAYS** use `node_modules/next/dist/bin/next` directly

---

## Design System

### CSS Variable Architecture
```css
:root {
  /* Colors */
  --bg: #f5f7fb;
  --surface: #ffffff;
  --surface-soft: #f8fafc;
  --text: #0f172a;
  --muted: #475569;
  --brand: #2563eb;
  --brand-strong: #1d4ed8;
  --brand-rgb: 37 99 235;
  --success: #046c4f;
  --danger: #b91c1c;
  --warn: #f59e0b;
  --line: #e2e8f0;
  --line-strong: #cbd5e1;

  /* Layout */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;

  /* Shadows */
  --shadow-subtle: 0 1px 2px 0 rgb(15 23 42 / 0.06);
  --shadow-medium: 0 12px 24px -16px rgb(15 23 42 / 0.3);
  --shadow-strong: 0 24px 48px -20px rgb(15 23 42 / 0.35);

  /* Motion */
  --motion-fast: 150ms;
  --motion-medium: 220ms;
  --motion-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

### Dark Mode
- Uses `@media (prefers-color-scheme: dark)` with `:root:not(.light)` selector
- Class-based `.dark` toggle via ThemeProvider
- ThemeProvider sets both `.dark` and `.light` classes on `<html>`
- Deep navy palette: `#0b1120` / `#111a2e` / `#18243a`
- Softened blue accents: `#7aa2ff` / `#5f85eb`

### Component Rules
- ALL colors MUST use CSS variables — no hardcoded hex in components
- Use `color-mix()` for adaptive backgrounds: `color-mix(in srgb, var(--brand) 15%, var(--surface))`
- Cards use glass morphism: `backdrop-filter: blur(10px)` + semi-transparent gradient
- Buttons use gradient: `linear-gradient(135deg, rgb(var(--brand-rgb)), var(--brand-strong))`
- Navigation uses glass: `backdrop-filter: blur(20px)` + `background: color-mix(in srgb, var(--surface) 85%, transparent)`

---

## Common Issues and Fixes

### Lint Fails with 1896 Errors
- Cause: `worktrees/` directories not in ESLint ignores
- Fix: Add `worktrees/**` to `eslint.config.mjs` ignores

### Build Warning: NFT List Tracing
- Cause: `observability.ts` uses `fs.readFile` / `path.join`
- Fix: Add `/* turbopackIgnore: true */` comment to `path.join()`

### Payment Provider MOCK Bypass
- Cause: `resolvePaymentProvider()` silently returns MOCK for unknown providers
- Fix: Throw error in production when MOCK is selected from external input

### Type Error: TS2540 on NODE_ENV
- Cause: `process.env.NODE_ENV` is read-only in TypeScript
- Fix: Use `vi.stubEnv("NODE_ENV", "production")` + `vi.unstubAllEnvs()`

---

## Files Reference

### Key Configuration
- `package.json` — scripts, dependencies
- `tsconfig.json` — TypeScript config
- `eslint.config.mjs` — ESLint config (FlatCompat)
- `next.config.ts` — Next.js config
- `prisma/schema.prisma` — Database schema
- `ecosystem.config.cjs` — PM2 config
- `.env.example` — Environment variables template

### Important Scripts
- `pnpm check` — Full quality gate
- `pnpm test` — Run tests
- `pnpm lint` — Lint code
- `pnpm typecheck` — Type check
- `pnpm build` — Production build
- `pnpm smoke:routes` — Public route smoke test
- `pnpm scan:secrets` — Secret scan
- `pnpm deploy:readiness` — Deployment readiness suite

### Source Structure
```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
├── lib/              # Utilities, business logic
├── worker/           # Background worker
├── scripts/          # Automation scripts
└── __tests__/        # Test files
```
