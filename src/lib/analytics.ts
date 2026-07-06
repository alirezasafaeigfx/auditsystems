"use client";

export type SeoEventName =
  | "seo_landing_view"
  | "seo_guide_view"
  | "seo_brand_portfolio_view"
  | "seo_audit_page_view"
  | "seo_audit_start"
  | "seo_audit_run_created"
  | "seo_audit_error"
  | "seo_audit_retry"
  | "seo_unlock_page_view"
  | "seo_unlock_started"
  | "seo_payment_success"
  | "seo_intent_router_view"
  | "seo_intent_router_click"
  | "seo_cta_click";

type SeoEventParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function hasConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("asdev_analytics_consent") === "granted";
  } catch {
    return false;
  }
}

export function trackSeoEvent(event: SeoEventName, params: SeoEventParams = {}): void {
  if (typeof window === "undefined") return;
  if (!hasConsent()) return;

  const payload = {
    ...params,
    event_category: "seo"
  };

  if (typeof window.gtag === "function") {
    window.gtag("event", event, payload);
    return;
  }

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({
    event,
    ...payload
  });
}
