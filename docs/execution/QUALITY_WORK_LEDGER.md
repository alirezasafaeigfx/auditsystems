# Audit paired-quality work ledger

Updated: 2026-09-01. Single writer: the current Audit coordinator. Authority: [canonical roadmap](../roadmaps/AUDIT_PUBLIC_EXPERIENCE.md). This ledger records evidence; it cannot weaken criteria or start a second queue.

## Reconciled initial state

### Completed implementation / hosted checks blocked — 2026-09-01T11:22:03Z

- Task: `AU-02` monotonic scoring correctness; executor/session: Codex coordinator with bounded implementation worker.
- Base/candidate: `feat/paired-au01-20260901` from `GITHUB_MAIN` `0fb6edcc483a701b0904c5d0aa38a8b3ab9dbf9a`; candidate `978e7b4c4dbd5663dbaa16d33367973cf9d5b34e`, PR #2.
- Proven gap: `calculateScore` returns overall `0` for one SECURITY/CRITICAL finding but `44` after adding an SEO/LOW finding; the added failure is falsely reported as improvement by comparison consumers.
- Changed paths: scoring/tests; versioned summary types/builder; strict persisted-score resolver/tests; comparison/UI tests; monthly normalization; PDF persisted-score selection. Access enforcement and scanner coverage remain outside this unit.
- Baseline evidence: existing scoring suite passed 9/9; the explicit invariant reproduction exited `42` with `invariant=false` under LOCAL_PC Node `24.19.0` / pnpm `9.15.0` (hosted Node 22 remains required).
- Acceptance: RED witnesses reproduced denominator dilution and cross-policy false deltas. LOCAL_PC: focused reviewer tests 29/29 PASS; full suite 888 PASS / 36 SKIP; lint, typecheck and clean detached-worktree build PASS. Independent correctness review PASS at candidate SHA. Hosted `docs`, `roadmap` and `Self-hosted quality gate` remain QUEUED, so integration is not accepted and no merge/deploy is claimed. Unknown scanner coverage remains an explicit AU-02 gap.

### Active claim — 2026-09-01T11:25:00Z

- Task: `AU-01` required-check runner availability; executor/session: Codex coordinator with bounded workflow worker.
- Base/candidate: new isolated branch from `GITHUB_MAIN` `0fb6edcc483a701b0904c5d0aa38a8b3ab9dbf9a`; candidate pending and separate from PR #2.
- Proven gap: PR #2 workflow runs `33502105811`, `33502105771` and `33502105876` are QUEUED with no steps; repository runner API reports `total_count=0`, while all three jobs require `[self-hosted, linux, x64, asdev-ci]`.
- Owned paths: `.github/workflows/main-gate.yml`, `.github/workflows/docs-automation.yml`, `.github/workflows/roadmap-automation.yml`, and focused workflow-contract tests only. No repository settings, secrets, production, payment or schema changes.
- Acceptance: smallest reviewable runner strategy that makes required checks genuinely executable, negative workflow contract tests, local lint/tests, separate PR, and an actual terminal hosted result. If owner infrastructure is required, record the exact runner-registration trigger instead of weakening/removing checks.

| Item | Verified source state | Meaning / next action |
|---|---|---|
| Main source | `0fb6edcc483a701b0904c5d0aa38a8b3ab9dbf9a` | Baseline re-read from GitHub; not a deployment identity |
| Paired docs | PR #1, initial head `415e9b371aa9721626d46967aaa0f07ed94e9cc1` | Open Draft at this revision's start; this docs extension is not an app fix |
| Companion ASDEV | main `2fe4988841a36c7f4eaf1da47fb5bffe22d00547`; PR #26 `72e634bc403c3038b546de10a2ebfca37db8ca2e` open | Reuse existing UI work; no claim it is deployed/accepted |
| AU-01…07 | OPEN / prior findings need criterion-level verification | Preserve task IDs; no correctness/security/UX fix is claimed here |
| AU-08…13 | OPEN — newly admitted quality/growth outcomes | Execute only dependency-ready work; no ranks, field measurements or user studies yet verified |
| Runtime and branch policy | Main observed unprotected in GitHub; no new runtime verification in this revision | Still use PRs/actual checks; no settings change or deployment authorization |
| Search/customer outcomes | UNVERIFIED | No authorized GSC/customer analytics dataset inspected in this revision |

Older reports/roadmaps remain dated historical records, not proof of current implementation, correctness or ranking. Reconcile existing evidence before running tests or writing code; do not erase old entries.

## One task record per real state change

For each claimed unit record: task ID; responsible executor/session and path ownership; start/base/candidate SHA; proven gap; dependencies; allowed files; implementation/test plan; reused evidence and equivalence reason; command results with exit/pass/fail/skip counts; artifacts with retrieval/hash; reviewer/type/disposition; acceptance by dimension; merge and deployed identities separately; rollback status; unresolved criteria; next action or retry trigger.

Keep these records compact. An uncommitted change is identified as such; old-SHA evidence does not become new-SHA evidence. Do not commit log-only “progress” while no task changed. Do not create fake empty PASS records.

## Resume/checkpoint contract

At a genuine boundary retain current task, last completed criterion, exact next command/action, source/branch/dirty state, peer task ownership, blockers, changed inputs, test/evidence pointers and remaining budget/runtime constraints. A later run verifies the checkpoint against actual Git and continues. It does not redo accepted work or rerun an unchanged deterministic failure.

After two consecutive attempts with the same failure/input signature and no new evidence, diagnose and mark only that lane BLOCKED with a concrete trigger; continue other ready work. Future traffic, credentials, review or observation requires AWAITING_OBSERVATION/BLOCKED, not an infinite poll loop. Implementation accepted, release verified and growth observed have separate verdicts.
