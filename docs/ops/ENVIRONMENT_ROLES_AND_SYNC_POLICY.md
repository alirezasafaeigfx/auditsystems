# ASDEV Environment Roles and Sync Policy — AuditSystems

**Status:** Mandatory by reference  
**Canonical policy:** `alirezasafaei-dev/alirezasafaeisystems/docs/governance/ENVIRONMENT_ROLES_AND_SYNC_POLICY.md`

AuditSystems agents must use the ASDEV canonical environment names:

- `LOCAL_PC` — owner's workstation and MiMo command center.
- `AUTOMATION_SERVER` — external automation server `asdev@91.107.153.223` for always-on sync, queue, MCP, agents, and reporting.
- `IRAN_PROD_SERVER` — Iran live production deployment server if AuditSystems is deployed there. Strictly gated.
- `GITHUB_MAIN` — GitHub main branch source of truth.

## Required behavior

- Do not say "local" or "server" without the canonical name.
- Do not deploy/rollback/reload nginx/migrate/modify production without exact approval phrase.
- Do not call deploy successful until `docs/ops/POST_DEPLOY_LIVE_VERIFICATION_POLICY.md` passes.
- Prompt/policy/queue changes belong in GitHub and must be pulled by `AUTOMATION_SERVER` sync automation.
- Hermes is the Telegram reporting owner.
- OpenClaw must not poll Telegram while Hermes is active.

## AuditSystems-specific note

AuditSystems is an ASDEV primary revenue product. Production reliability, live verification, lead/audit flow integrity, and report trust are top-priority operational concerns.
