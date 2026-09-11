import type { AuditCtaEntry } from "./audit-cta-registry";
import { trackAuditCtaClick } from "./audit-cta-tracking";
import type { SampleLocale } from "./sample-report/types";

export type IntentRouterRouteKey = "audit" | "execution" | "toolbox";

/**
 * Canonical destination metadata for the three IntentRouter choices.
 * Rendering code consumes this map instead of carrying a second set of hrefs.
 */
export const INTENT_ROUTER_CTA_MAP: Record<IntentRouterRouteKey, AuditCtaEntry> = {
  audit: {
    id: "intent_router_audit_start",
    intent: "audit_start",
    surface: "audit_landing",
    label: { fa: "شروع ارزیابی خودکار", en: "Start automated audit" },
    path: "/audit",
    analyticsEvent: "seo_cta_click",
    variant: "primary",
  },
  execution: {
    id: "intent_router_professional_review",
    intent: "implementation_enquiry",
    surface: "audit_landing",
    label: { fa: "درخواست همکاری برای اجرا", en: "Request implementation support" },
    path: "https://alirezasafaeisystems.ir/qualification?utm_source=audit&utm_medium=intent_router&utm_campaign=asdev_audit&utm_content=implementation_enquiry",
    external: true,
    analyticsEvent: "seo_cta_click",
    variant: "secondary",
  },
  toolbox: {
    id: "intent_router_toolbox",
    intent: "agency_contact",
    surface: "audit_landing",
    label: { fa: "ورود به PersianToolbox", en: "Open PersianToolbox" },
    path: "https://persiantoolbox.ir/?utm_source=audit&utm_medium=intent_router&utm_campaign=asdev_audit&utm_content=toolbox_route",
    external: true,
    analyticsEvent: "seo_cta_click",
    variant: "secondary",
  },
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
