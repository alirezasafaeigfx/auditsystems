# Contributing to AuditSystems

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/alirezasafaei-dev/auditsystems.git
cd auditsystems
pnpm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your values (at minimum: DATABASE_URL, secrets)

# 3. Set up database
docker compose up -d
pnpm db:migrate

# 4. Run dev server
pnpm dev
```

## Project Structure

```
src/
  app/              # Next.js App Router pages
    app/            # Authenticated dashboard (/app/*)
    api/            # API routes
    audit/          # Public audit flow
  lib/              # Shared utilities
  components/       # React components
  worker/           # Background job processor
prisma/
  schema.prisma     # Database schema
scripts/            # Deployment and ops scripts
docs/               # Documentation
```

## Development Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm test` | Run all tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm lint` | Lint code |
| `pnpm typecheck` | Type check |
| `pnpm check` | Lint + typecheck + test + build |
| `pnpm build` | Production build |
| `pnpm smoke:routes` | Smoke test public routes |

## Testing

Tests use Vitest. Co-located with source files:

```
src/lib/auth.ts       # Implementation
src/lib/auth.test.ts  # Tests
```

### Writing Tests

```typescript
import { describe, expect, it } from "vitest";
import { myFunction } from "./myModule";

describe("myFunction", () => {
  it("does something", () => {
    expect(myFunction("input")).toBe("output");
  });
});
```

### Rules

- Pure functions: test directly
- Database-dependent: mock or use integration tests
- No network calls in unit tests
- Run `pnpm test` before committing

## Code Style

- TypeScript strict mode (no `any`)
- ESLint with zero warnings
- Functional style preferred
- Small, focused files
- No comments unless requested

## Git Workflow

1. Create feature branch from `main`
2. Make changes in small commits
3. Run `pnpm check` before pushing
4. Open PR with description
5. Squash merge to main

### Commit Messages

```
feat: add new feature
fix: fix bug
refactor: refactor code
test: add tests
docs: update documentation
chore: maintenance tasks
```

## Architecture Notes

### Authentication
- Session-based with httpOnly cookies
- CSRF protection via double-submit cookie pattern
- Auth rate limiting (15 min window, 10 attempts)

### Plans & Usage
- Centralized in `src/lib/plans.ts`
- Usage helpers in `src/lib/usage.ts`
- Free plan: 1 project, 3 audits/month

### API Routes
- All state-changing routes require CSRF token
- GET `/api/csrf` returns token
- Client fetches token before POST requests

## Getting Help

- Check `docs/` for detailed documentation
- Run `pnpm smoke:routes` to verify setup
- Look at existing tests for patterns
