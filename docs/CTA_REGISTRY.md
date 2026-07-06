# CTA Registry — AuditSystems

Canonical conversion tracking for public audit surfaces.

## Source of truth

- Registry: `src/lib/audit-cta-registry.ts`
- Component: `src/components/AuditCtaLink.tsx`
- Click tracking: `src/lib/audit-cta-tracking.ts` → `seo_cta_click`
- IntentRouter adapter: `src/lib/intent-router-cta.ts` (layout unchanged; analytics unified)

## Event payload

Every registry-backed click emits:

```json
{
  "event": "seo_cta_click",
  "cta_id": "sample_report_audit_start",
  "intent": "audit_start",
  "surface": "sample_report",
  "destination": "/audit",
  "locale": "fa"
}
```

Prefill CTAs include `destination` with `?url=` query.

## Migration status

See `CTA_MIGRATION_STATUS` in the registry file.

**Registry-backed:** sample report, audit home/landing, pricing footer, IntentRouter (via adapter).

**Ad-hoc (documented):** layout navigation, plan signup buttons (billing scope), EN hero external links, FAQ/failed retry links.

## Adding a CTA

1. Add entry to `audit-cta-registry.ts` with stable `id`, `intent`, `surface`.
2. Render with `<AuditCtaLink ctaId="..." locale="fa" />`.
3. Extend `audit-cta-registry.test.ts` if the surface is new.

Do not add one-off `trackSeoEvent("seo_cta_click", …)` calls in page components.

## Smoke coverage

`scripts/smoke-public-routes.sh` includes `/sample-report`, `/en/sample-report`, `/audit`, `/en/audit`, `/pricing`, `/en/pricing`.