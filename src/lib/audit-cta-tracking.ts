import { trackSeoEvent } from "./analytics";
import {
  buildAuditCtaHref,
  getAuditCta,
  type AuditCtaEntry,
} from "./audit-cta-registry";
import type { SampleLocale } from "./sample-report/types";

const SAFE_EXTRA_VALUES: Record<string, ReadonlySet<string | number | boolean | null>> = {
  intent_router_variant: new Set(["audit_first", "execution_first"]),
  legacy_event: new Set(["seo_intent_router_click"]),
};

function safeTrackingExtra(
  extra?: Record<string, string | number | boolean | null | undefined>
): Record<string, string | number | boolean | null> {
  if (!extra) {
    return {};
  }

  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(extra)) {
    if (value === undefined || !SAFE_EXTRA_VALUES[key]?.has(value)) {
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

export function trackAuditCtaClick(
  entry: AuditCtaEntry,
  locale: SampleLocale,
  options?: { prefillUrl?: string; extra?: Record<string, string | number | boolean | null | undefined> }
): void {
  // prefillUrl is retained only as a compatibility parameter. The canonical
  // destination builder deliberately ignores it so audited/customer URLs are
  // never copied into navigation or analytics payloads.
  const destination = buildAuditCtaHref(entry, locale, { prefillUrl: options?.prefillUrl });
  trackSeoEvent("seo_cta_click", {
    cta_id: entry.id,
    intent: entry.intent,
    surface: entry.surface,
    destination,
    locale,
    ...safeTrackingExtra(options?.extra),
  });
}

export function trackAuditCtaById(
  ctaId: string,
  locale: SampleLocale,
  options?: { prefillUrl?: string; extra?: Record<string, string | number | boolean | null | undefined> }
): boolean {
  const entry = getAuditCta(ctaId);
  if (!entry) {
    return false;
  }
  trackAuditCtaClick(entry, locale, options);
  return true;
}
