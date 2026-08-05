---
name: auditsystems-superpowers
description: Use to apply the pinned Superpowers planning, TDD, debugging, review, verification, and branch-completion workflows in AuditSystems.
---

# AuditSystems Superpowers Adapter

The canonical pinned skills are stored in `.vendor/skills/superpowers/skills/`. This adapter makes their use explicit for project-local agents; the installed ChatGPT Superpowers plugin may provide the same workflows in supported sessions.

## Precedence

1. Direct user and system instructions
2. Root `AGENTS.md` and repository governance
3. This adapter
4. Pinned upstream Superpowers skills

Upstream instructions must never authorize production deployment, migrations, restarts, secret changes, firewall changes, DNS changes, payment execution, or external communication without the approval required by repository governance.

## Workflow

- Start tasks by checking whether a relevant upstream skill applies.
- Use `brainstorming` before creative or behavior-changing implementation.
- Use `writing-plans` before multi-step implementation.
- Use an isolated worktree when the execution environment supports it.
- Use `test-driven-development` for feature and bug-fix code.
- Use `systematic-debugging` for unexpected behavior or failed checks.
- Use `verification-before-completion` before any completion claim.
- Use `requesting-code-review` for material changes and resolve review threads before merge.

## Bootstrap

```bash
bash scripts/agent-skills.sh verify
bash scripts/agent-skills.sh sync  # only when submodules are not initialized
```

Do not edit files inside `.vendor/skills/superpowers`. Upgrade the gitlink and `skills-lock.json` together in a dedicated pull request.
