import { trackSeoEvent } from "./analytics";
import {
  buildAuditCtaHref,
  getAuditCta,
  type AuditCtaEntry,
} from "./audit-cta-registry";
import type { SampleLocale } from "./sample-report/types";

const SAFE_EXTRA_KEYS = new Set([
  "intent_router_variant",
  "legacy_event",
  "source",
  "placement",
  "offer",
]);

function safeTrackingExtra(
  extra?: Record<string, string | number | boolean | null | undefined>
): Record<string, string | number | boolean | null> {
  if (!extra) {
    return {};
  }

  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(extra)) {
    if (!SAFE_EXTRA_KEYS.has(key) || value === undefined) {
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
