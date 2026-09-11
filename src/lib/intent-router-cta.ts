import { getAuditCta, type AuditCtaEntry } from "./audit-cta-registry";
import { trackAuditCtaClick } from "./audit-cta-tracking";
import type { SampleLocale } from "./sample-report/types";

export type IntentRouterRouteKey = "audit" | "execution" | "toolbox";

function requireRegistryEntry(id: string): AuditCtaEntry {
  const entry = getAuditCta(id);
  if (!entry) {
    throw new Error(`Missing required IntentRouter CTA registry entry: ${id}`);
  }
  return entry;
}

/**
 * IntentRouter resolves its destinations from the central registry so labels,
 * ownership, locale behavior and analytics cannot drift in a second map.
 */
export const INTENT_ROUTER_CTA_MAP: Record<IntentRouterRouteKey, AuditCtaEntry> = {
  audit: requireRegistryEntry("intent_router_audit_start"),
  execution: requireRegistryEntry("sample_report_pro_review"),
  toolbox: requireRegistryEntry("intent_router_toolbox"),
};

export function trackIntentRouterCtaClick(
  route: IntentRouterRouteKey,
  locale: SampleLocale,
  variant: string
): void {
  const entry = INTENT_ROUTER_CTA_MAP[route];
  trackAuditCtaClick(entry, locale, {
    extra: { intent_router_variant: variant, legacy_event: "seo_intent_router_click" },
  });
}
