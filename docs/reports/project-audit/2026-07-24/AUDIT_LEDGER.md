# Audit Ledger — 2026-07-24 (Final)

**Branch**: `main`
**Base SHA**: `80732ae`
**Final SHA**: `a68b06d`
**Production**: https://audit.alirezasafaeisystems.ir/

---

## Baseline (Start of Session)

| Check | Status |
|---|---|
| `pnpm lint` | FAIL (1896 errors) |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS (741/741) |
| `pnpm build` | PASS |
| `pnpm smoke:routes` | PASS (17/17) |
| `pnpm check` | FAIL (exit 1) |

## Final State (End of Session)

| Check | Status |
|---|---|
| `pnpm lint` | PASS (0 errors) |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS (745/745) |
| `pnpm build` | PASS |
| `pnpm smoke:routes` | PASS (17/17) |
| `pnpm check` | PASS (exit 0) |
| `pnpm scan:secrets` | PASS |
| `pnpm check:actions-pinned` | PASS |
| `pnpm check:no-database-dumps` | PASS |
| Production health | READY (db+redis pass) |
| Dark mode | FIXED (all hardcoded colors replaced) |
| Rebrand | COMPLETE (green→blue) |
| Design | MATCHES PersianToolbox |

---

## All Commits (2026-07-24)

| # | Hash | Message |
|---|---|---|
| 1 | `646d968` | fix(ci): exclude worktrees from ESLint, add gitignore, log silent catches |
| 2 | `c5c75e4` | fix(security): block MOCK provider, validate payments, fix race conditions |
| 3 | `5c758fa` | feat(newsletter): store signups in database with dedup and resubscribe |
| 4 | `746e9c8` | docs(audit): update ledger |
| 5 | `d3403ee` | fix(security): harden admin auth timing, Cache-Control, auth-gate metrics |
| 6 | `8c7e4d0` | rebrand: replace green (#0f7a66) with blue (#2563eb) throughout |
| 7 | `50d1bc6` | design: match PersianToolbox visual language |
| 8 | `b4af350` | fix(dark-mode): replace all hardcoded light-only colors with CSS variables |

## All PRs

| # | Title | Status |
|---|---|---|
| #75 | audit: complete repository and production remediation | MERGED |
| #74 | refactor(types): remove explicit any from audit runtime | MERGED |
| #73 | fix(payment): fail closed for unverified providers | CLOSED (superseded) |

## All Deployments

| Release | Date | Status |
|---|---|---|
| `20260724T143523Z-cbb49e5` | 14:35 UTC | DEPLOYED |
| `20260724T152402Z-879a1fc` | 15:24 UTC | DEPLOYED (rebrand) |
| `20260724T154359Z-299ac51` | 15:43 UTC | DEPLOYED (design) |
| `20260724T160226Z-a68b06d` | 16:02 UTC | DEPLOYED (dark mode) |

## Production Server State

| Field | Value |
|---|---|
| Host | `ubuntu@193.93.169.32` |
| Port | 3012 |
| PM2 web | `auditsystems-web` (online) |
| PM2 worker | `auditsystems-worker` (online) |
| Release | `20260724T160226Z-a68b06d` |
| Database | PostgreSQL 16 — connected |
| Redis | Connected |
| SSL | Let's Encrypt (valid until Sep 2026) |

## Files Changed (Summary)

| Category | Files | Changes |
|---|---|---|
| CI/Lint config | 2 | eslint.config.mjs, .gitignore |
| Security (payments) | 3 | payments.ts, billing/callback, payments/callback |
| Security (auth) | 1 | admin-auth.ts |
| Security (headers) | 7 | 7 admin/user API routes |
| Newsletter | 3 | schema, migration, route |
| Error logging | 2 | audit.handler.ts, signup/route.ts |
| Tests | 1 | payment-flow.test.ts |
| Design (rebrand) | 24 | globals.css + 23 component/page files |
| Dark mode | 23 | globals.css + 22 component/page files |
| Agent governance | 1 | AGENTS.md |
| Documentation | 1 | AUDIT_LEDGER.md |

## Remaining Items (External Only)

1. **Email provider integration** — requires provider decision + API keys
2. **DNS configuration** — requires DNS provider access
3. **Payment API verification** — requires PayPing/IdPay sandbox access
4. **Language switcher** — may need live browser testing (code logic appears correct)

## Follow-up — Hosting Topology Diagnostics (2026-09-09)

| Boundary | Verdict | Evidence |
|---|---|---|
| Repository implementation | CORRECTION_IN_REVIEW | PR [#13](https://github.com/alirezasafaeigfx/auditsystems/pull/13) replaces an unavailable `rg` dependency, fails closed on unavailable probe execution, and adds deterministic required-gate coverage. |
| Topology correctness | PARTIAL_CONTRADICTORY | Portable repository defaults remain production/staging `3010`/`3011`; later runbooks record production `3012`. No default port was changed. |
| Infrastructure | UNPROVEN | No authorized on-host registry, Nginx, PM2, symlink, or release attestation was available. Issue [#12](https://github.com/alirezasafaeigfx/auditsystems/issues/12) tracks authorization-gated reconciliation. |
| Staging | EXTERNAL_DISCREPANCY_UNPROVEN_INTENT | System DNS, Google DoH, and Cloudflare DoH returned NXDOMAIN at `2026-09-09T18:49:34Z`; public HTTPS readiness exited 6. Repository documents do not establish whether staging was intentionally retired. |
| Production | PUBLIC_ENDPOINT_REACHABLE_DEPLOYED_SHA_UNVERIFIED | Public `/api/ready` and `/api/health` returned HTTP 200 at `2026-09-09T18:49:53Z`; this does not attest the deployed SHA or active host topology. |
| Deployment | NOT_PERFORMED | No deploy, migration, DNS, Nginx, firewall, VPS, service, runner, secret, database, or payment mutation occurred. |
| Evidence durability | PARTIAL | GitHub issue/PR and committed ledger are durable; Actions run `34387931972` and its artifact are expiring evidence, while live DNS/HTTP observations are timestamped snapshots. |

The four `pattern not found` failures in run `34387931972` were repository diagnostic false positives: the raw hosted log records `rg: command not found`, while every expected literal exists at the exact candidate SHA. The production A-record expectation dated to February 2026 and was stale against July governance plus three fresh public resolvers. The remaining staging and active-runtime questions require the authorization and evidence listed in issue #12.

## Follow-up — AU-01 Report Access Enforcement (2026-09-09)

| Boundary | Verdict | Evidence |
|---|---|---|
| Repository implementation | CORRECTION_IN_REVIEW | Synthetic tests proved that password-protected report HTML/RSC and comparisons rendered protected fields before authorization. A report-bound, expiring, HttpOnly HMAC credential now gates HTML/RSC, report API, capture, and comparison consumers; PDF delivery accepts that credential or the existing paid download credential. |
| Access semantics | PASS_SYNTHETIC | Public legacy reports remain readable. Absent, malformed, expired, revoked, and cross-report credentials fail closed. Protected report body, findings, scores, customer URL, comparison data, capture metadata, and PDF bytes are absent from unauthorized responses. |
| Credential transport | PASS_SYNTHETIC | Passwords remain request-body-only. Newly issued access and paid-download credentials are HttpOnly, SameSite=Strict cookies and are not placed in success URLs, redirect locations, or rendered links. The legacy direct PDF `dl` input remains accepted for backward compatibility. |
| Cache boundary | PASS_STATIC_AND_UNIT | Protected server-rendered routes are force-dynamic with zero revalidation; unauthorized APIs and generated PDF responses use private/no-store semantics. Shared-cache/CDN behavior has not been asserted against Production. |
| Dependency advisories | PARTIAL | Next.js is updated from 16.2.10 to 16.3.3 and Cheerio's Undici is overridden to 7.29.0. One high-severity `deepmerge-ts` advisory remains in the Prisma 6 configuration-tool chain; the available patched path requires a major Prisma upgrade and is outside this bounded task. |
| Browser/runtime acceptance | UNAVAILABLE | No disposable PostgreSQL `DATABASE_URL`, Docker, Podman, or local PostgreSQL executable was available, so a built application backed by synthetic database rows could not be exercised in a browser. Route, RSC-render, API, comparison, capture, and PDF handlers were exercised directly with disposable fixtures. |
| Production | UNVERIFIED | No customer data, real customer URL/token, Production response, or active cache was used as acceptance evidence. |
| Deployment | NOT_PERFORMED | No deploy, migration, DNS, Nginx, firewall, VPS, staging, runner, secret, database, payment, or live-service mutation occurred. |

The AU-01 candidate is based on `e6165a825376e52cb61447e67fd734dd2d67ced8`. Final PR head, hosted checks, review disposition, and merge SHA must be recorded from GitHub before this entry is treated as merged evidence.

## Follow-up — AU-02 Score and Coverage Semantics (2026-09-10)

| Boundary | Verdict | Evidence |
|---|---|---|
| Demonstrated defect | CORRECTED_IN_REVIEW | `calculateScore([])` and empty per-category finding sets produced `100`/`EXCELLENT`; report, API, comparison, and PDF consumers then reused or recomputed that aggregate without an authoritative coverage state. |
| Canonical semantics | PASS_SYNTHETIC | The shared result resolver separates processing status, score, coverage, availability, confidence, and comparison eligibility. Unknown, failed, stale, malformed, unsupported, contradictory, duplicate, and empty current evidence fail closed; partial numeric risk scores remain explicitly partial. |
| Surface consistency | PASS_SYNTHETIC | Synthetic entry-point tests cover FA/EN report rendering, machine-readable report API output, comparison deltas, and PDF generation. Missing categories are unavailable rather than `100`; failed and invalid records expose no numeric score. |
| Legacy compatibility | PASS_SYNTHETIC | Structurally valid historical aggregates remain readable as `LEGACY` with unknown coverage and are excluded from comparable deltas. No stored report or Production row is rewritten. |
| Database/browser acceptance | PARTIAL | Direct route, RSC-render, comparison, and PDF tests use disposable `.invalid` fixtures. The local Windows worktree has no disposable PostgreSQL/browser database environment; hosted PostgreSQL validation remains candidate-bound evidence. |
| Dependency advisory | OPEN_SEPARATE | Issue [#15](https://github.com/alirezasafaeigfx/auditsystems/issues/15) tracks `GHSA-ggr8-5vv4-36mx` through Prisma 6 configuration tooling. AU-02 does not suppress the advisory or perform a major dependency upgrade. |
| Production | UNVERIFIED | Public smoke checks are reachability snapshots only. No customer report, token, URL, Production database row, deployed SHA, or live cache was used as AU-02 acceptance evidence. |
| Deployment | NOT_PERFORMED | No deployment, migration, DNS, Nginx, firewall, VPS, staging, runner, database, payment, or live-service mutation occurred. |

AU-02 is based on `e8c9f03d72acc1cdb0ebecf12c5c9fe1cc90cdac`. The exact PR head, hosted results, independent review disposition, and merge SHA remain GitHub integration evidence and must be recorded separately.
