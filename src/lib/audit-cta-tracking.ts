import { trackSeoEvent } from "./analytics";
import {
  buildAuditCtaHref,
  getAuditCta,
  type AuditCtaEntry,
} from "./audit-cta-registry";
import type { SampleLocale } from "./sample-report/types";

export function trackAuditCtaClick(
  entry: AuditCtaEntry,
  locale: SampleLocale,
  options?: { prefillUrl?: string; extra?: Record<string, string | number | boolean | null | undefined> }
): void {
  const destination = buildAuditCtaHref(entry, locale, { prefillUrl: options?.prefillUrl });
  trackSeoEvent("seo_cta_click", {
    cta_id: entry.id,
    intent: entry.intent,
    surface: entry.surface,
    destination,
    locale,
    ...options?.extra,
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