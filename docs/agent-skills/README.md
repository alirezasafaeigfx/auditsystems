# Project-local Agent Skills

AuditSystems pins three upstream skill repositories as Git submodules and adds thin project adapters that enforce repository governance.

## Installed Sources

| Source | Project path | Integration |
| --- | --- | --- |
| UI/UX Pro Max | `.vendor/skills/ui-ux-pro-max` | Codex adapter at `.codex/skills/ui-ux-pro-max/SKILL.md` |
| Superpowers | `.vendor/skills/superpowers` | Project adapter at `.agents/skills/auditsystems-superpowers/SKILL.md` |
| Marketing Skills | `.agents/marketingskills` | Project adapter at `.agents/skills/auditsystems-marketing/SKILL.md` |

Exact commits, licenses, adapters, and required files are declared in `skills-lock.json`.

## Initialize

```bash
bash scripts/agent-skills.sh sync
```

The command verifies gitlink pins before network access, synchronizes submodule URLs from `.gitmodules`, checks out the exact commits, and verifies required upstream files. It never performs a global package installation.

## Verify Without Network

```bash
bash scripts/agent-skills.sh verify
bash scripts/tests/test-agent-skills-integrity.sh
```

The verifier checks:

- lock schema and no-floating-ref policy
- HTTPS GitHub source URLs
- exact 40-character commit SHAs
- `.gitmodules` path and URL agreement
- gitlink mode and SHA in the Git index
- project adapters
- checked-out HEAD and required files when submodules are initialized

CI intentionally verifies the committed gitlinks without initializing upstream code. This prevents pull requests from executing third-party checkout hooks or installers.

## Upgrade Procedure

1. Review upstream release notes, diff, license, and security posture.
2. Update one source at a time in a dedicated branch.
3. Move the corresponding gitlink to the reviewed full commit SHA.
4. Update `skills-lock.json` in the same commit.
5. Run the verifier and integrity tests.
6. Open a pull request and merge only after required checks and review.

Do not edit vendor files in place, follow `main`, run global installers, or auto-update these sources during application installation or deployment.
