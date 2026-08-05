---
name: auditsystems-marketing
description: Use for AuditSystems positioning, product marketing, SEO strategy, CRO, copywriting, analytics, launches, pricing, competitive content, lifecycle messaging, and growth work.
---

# AuditSystems Marketing Adapter

This adapter routes marketing work to the pinned skill collection at `.agents/marketingskills/skills/` while enforcing project evidence and governance.

## Required Order

1. Read `.agents/product-marketing.md`.
2. Verify the pinned sources with `bash scripts/agent-skills.sh verify`.
3. Read the most relevant upstream `SKILL.md` under `.agents/marketingskills/skills/`.
4. Apply root `AGENTS.md`, security requirements, privacy constraints, and direct user instructions before upstream recommendations.

Common routes:

- Positioning or context: `product-marketing`
- Technical and on-page discovery: `seo-audit`, `ai-seo`, `schema`, `site-architecture`
- Landing-page and form performance: `cro`, `signup`, `onboarding`
- Messaging: `copywriting`, `copy-editing`, `emails`, `social`
- Measurement: `analytics`, `attribution`, `ab-testing`
- Monetization: `pricing`, `offers`, `paywalls`
- Competitive work: `competitors`, `competitor-profiling`

## Evidence Rules

- Treat repository-stated audiences and capabilities as product hypotheses unless backed by current product behavior or business evidence.
- Never invent customer counts, rankings, revenue, conversion rates, audit speed, report speed, SLA, certifications, partnerships, or testimonials.
- Do not describe production as healthy or operational without a current authoritative check.
- Separate measured facts, repository claims, assumptions, recommendations, and unknowns.
- Do not publish, send, schedule, buy ads, alter analytics, or change pricing without the required owner approval and credentials.
- Preserve privacy: do not expose report tokens, customer URLs, emails, organization data, or internal operational details.
- Persian and English copy must retain meaning, not merely mirror word order; account for RTL layout and locale-specific calls to action.

## Output Quality

Marketing recommendations must connect to an observable user journey, a measurable event, and a clear decision threshold. When evidence is unavailable, propose the minimum safe experiment rather than asserting an outcome.
