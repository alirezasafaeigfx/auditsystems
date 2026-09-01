# Audit paired-quality work ledger

Updated: 2026-09-01. Single writer: the current Audit coordinator. Authority: [canonical roadmap](../roadmaps/AUDIT_PUBLIC_EXPERIENCE.md). This ledger records evidence; it cannot weaken criteria or start a second queue.

## Reconciled initial state

### Integrated resilience unit — 2026-09-01T16:45:57Z

- Task: `AU-06` qualification submission recovery; executor/session: Codex coordinator with independent read-only reviewer.
- Base/candidate/merge: branch `fix/au06-qualification-resilience-20260901` from `GITHUB_MAIN` `4005f019887c8c0394a3b85857163420085a8062`; PR #4 head `db32fd589761dfe5205823bac03fba81bde446be`; squash merge `d4382fafa00b78b34cc5d3008e62bd5a46ff4ac0`.
- Proven gap: a rejected `fetch` or non-JSON response escaped the submit handler and left the form permanently disabled in `submitting` state.
- Changed paths: `src/app/qualification/QualificationForm.tsx`, `src/lib/qualification-submit.ts`, `src/lib/qualification-submit.test.ts`. The uncontrolled form remains mounted on error, preserving entries; retry creates a fresh request/event ID. Locale parity and browser-state matrix remain separate AU-06 work.
- Acceptance: RED module-missing witness; focused 4/4 PASS; full Vitest 892 PASS / 36 SKIP; lint and typecheck PASS; independent review PASS. Hosted PR #4 runs `33532646062`, `33532646174`, `33532645987` all SUCCESS. LOCAL_PC build was UNVERIFIED because Next inferred `D:\My_Projects` from a parent lockfile and then could not resolve parent-root `@tailwindcss/postcss`; no dependency/config change was mixed into the unit. Integration PASS; deployment/live verification UNVERIFIED.

### Integrated language-parity unit — 2026-09-01T16:53:09Z

- Task: `AU-06` FA/EN qualification continuity; base/candidate/merge: `GITHUB_MAIN` `045273a6b509aef7cdae3c62c85a6b2557b5a542`, PR #5 head `4c6390e74442a7c228141728f737836565a9be72`, squash merge `bf3a0c3bbeb1b2b7e9a3183b26e68b4f76cfc461`.
- Proven gap: `/en/qualification` rendered Persian form labels, errors, success copy and root-locale follow-up links despite an English wrapper.
- Changed paths: typed `qualification-copy` contract/tests, shared form copy selection, and the English wrapper locale prop. API field names, enum values, consent, source attribution and submit-event behavior are unchanged.
- Acceptance: RED missing-copy module; focused 6/6 PASS; full Vitest 894 PASS / 36 SKIP; lint/typecheck/diff-check PASS; independent review PASS. Hosted PR #5 runs `33534169396`, `33534169398`, `33534169349` all SUCCESS. Integration PASS; actual deployed FA/EN route verification remains UNVERIFIED.

### Integrated accessible-retry unit — 2026-09-01T16:58:20Z

- Task: `AU-06` explicit accessible retry; base/candidate/merge: `GITHUB_MAIN` `22f873e15ca47b9e1c6e4899352760095e528545`, PR #6 head `0affabf49a5fe8437e47107ada0f178557e8eff0`, squash merge `e0658a760adc587a4767103522727b6d72acd010`.
- Proven gap/fix: the recoverable alert was announced but not focused and the re-enabled action did not say retry. The mounted alert is now programmatically focused once per error transition and the user-triggered CTA is localized as `Try again` / `تلاش دوباره`; no automatic resubmission was added.
- Acceptance: RED retry-copy assertions in both locales; focused 6/6 PASS; full Vitest 894 PASS / 36 SKIP; typecheck/ESLint/diff-check PASS; independent review PASS. Hosted PR #6 runs `33534746025`, `33534746015`, `33534746013` all SUCCESS. Integration PASS; browser interaction and deployment/live evidence remain UNVERIFIED.

### Integrated implementation — 2026-09-01T15:37:25Z

- Task: `AU-02` monotonic scoring correctness; executor/session: Codex coordinator with bounded implementation worker.
- Base/candidate/merge: `feat/paired-au01-20260901` from `GITHUB_MAIN` `0fb6edcc483a701b0904c5d0aa38a8b3ab9dbf9a`; reviewed implementation `978e7b4c4dbd5663dbaa16d33367973cf9d5b34e`, final PR #2 head `fb11e427c636b807cd6eceec6be2e641e2b3e117`, squash merge `4babbfea3305153d153ff88038798771d46ad75e`.
- Proven gap: `calculateScore` returns overall `0` for one SECURITY/CRITICAL finding but `44` after adding an SEO/LOW finding; the added failure is falsely reported as improvement by comparison consumers.
- Changed paths: scoring/tests; versioned summary types/builder; strict persisted-score resolver/tests; comparison/UI tests; monthly normalization; PDF persisted-score selection. Access enforcement and scanner coverage remain outside this unit.
- Baseline evidence: existing scoring suite passed 9/9; the explicit invariant reproduction exited `42` with `invariant=false` under LOCAL_PC Node `24.19.0` / pnpm `9.15.0` (hosted Node 22 remains required).
- Acceptance: RED witnesses reproduced denominator dilution and cross-policy false deltas. LOCAL_PC: focused reviewer tests 29/29 PASS; full suite 888 PASS / 36 SKIP; lint, typecheck and clean detached-worktree build PASS. Independent correctness review PASS. Hosted `docs`, `roadmap` and preserved-context `Self-hosted quality gate` passed at final PR head after AU-01 runner repair. Integration PASS; deployment/live verification UNVERIFIED. Unknown scanner coverage remains an explicit AU-02 gap.

### Integrated runner repair — 2026-09-01T12:48:00Z

- Task: `AU-01` required-check runner availability; executor/session: Codex coordinator with bounded workflow worker.
- Base/candidate/merge: isolated PR #3 from `0fb6edcc483a701b0904c5d0aa38a8b3ab9dbf9a`; reviewed head `c83b3f59d820cfacc5a17cb705cc180d0bd0326d`; squash merge `e6cab21d5862d065dd4755df6d0085869696212e`.
- Proven gap: PR #2 workflow runs `33502105811`, `33502105771` and `33502105876` are QUEUED with no steps; repository runner API reports `total_count=0`, while all three jobs require `[self-hosted, linux, x64, asdev-ci]`.
- Owned paths: `.github/workflows/main-gate.yml`, `.github/workflows/docs-automation.yml`, `.github/workflows/roadmap-automation.yml`, and focused workflow-contract tests only. No repository settings, secrets, production, payment or schema changes.
- Acceptance: three required workflows use `ubuntu-latest` while preserving check names/gates/permissions; exact-job regression contract runs inside main-gate. PR #3 runs `33509241813`, `33509241731`, `33509241702` all SUCCESS, including build/smoke/cleanup; independent review PASS. No repository setting, secret, deployment or production mutation.

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
