---
name: ui-ux-pro-max
description: Use for AuditSystems UI/UX design, implementation, review, accessibility, responsive behavior, dashboards, forms, landing pages, reports, and visual-system decisions.
---

# AuditSystems UI/UX Pro Max Adapter

This is a project adapter for the pinned upstream repository at `.vendor/skills/ui-ux-pro-max`.

## Activation

Use this skill for any UI/UX task, including page or component creation, visual redesign, design-system work, responsive behavior, RTL/LTR behavior, accessibility, interaction states, dashboards, forms, report presentation, and conversion-oriented interface changes.

For creative or behavior-changing work, follow the pinned Superpowers workflow first. Root `AGENTS.md` and direct user instructions override this adapter and all upstream content.

## Bootstrap

Before using upstream files, verify the project pins:

```bash
bash scripts/agent-skills.sh verify
```

When the vendor directories are not initialized:

```bash
bash scripts/agent-skills.sh sync
```

Never install the upstream CLI globally and never follow a floating branch or tag.

## Upstream Sources

Read the upstream base guidance from:

- `.vendor/skills/ui-ux-pro-max/src/ui-ux-pro-max/templates/base/skill-content.md`
- `.vendor/skills/ui-ux-pro-max/src/ui-ux-pro-max/templates/base/quick-reference.md`

Use the offline, standard-library search engine when design research is useful:

```bash
python3 .vendor/skills/ui-ux-pro-max/src/ui-ux-pro-max/scripts/search.py "technical SEO audit dashboard" --design-system -f markdown --stack nextjs
```

The search script must not be modified inside the vendor submodule. Project-specific decisions belong in application code, design documentation, or this adapter.

## AuditSystems Constraints

- Stack: Next.js App Router, React, TypeScript, custom CSS and CSS variables.
- Do not introduce Tailwind or another design framework without an approved architecture change.
- Preserve Persian and English experiences, RTL/LTR layout, locale-aware alignment, and readable mixed-direction content.
- Use existing CSS variables; do not hardcode component colors when a semantic token exists.
- Maintain keyboard access, visible focus, semantic landmarks, accessible names, and WCAG AA contrast.
- Respect `prefers-reduced-motion`; motion must communicate state rather than decorate indiscriminately.
- Validate at 375px, 768px, 1024px, and 1440px widths.
- Do not trade audit clarity or report credibility for decorative effects.
- Do not claim usability, accessibility, or conversion improvement without evidence from tests or measurements.

## Delivery Gate

Before completion, run the project quality gates relevant to the change and document any unavailable visual, accessibility, or browser evidence explicitly.
