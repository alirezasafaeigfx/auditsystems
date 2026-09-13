"use client";

import { sanitizeMeasurementPath } from "./measurement-safety";

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
  | "seo_cta_click"
  | "seo_blog_view"
  | "seo_case_study_view";

type SeoEventParams = Record<string, string | number | boolean | null | undefined>;

const ALLOWED_DIMENSIONS = new Set([
  "locale", "path", "slug", "cta_id", "intent", "surface", "destination_class",
  "placement", "offer", "variant", "intent_router_variant", "depth", "has_url",
  "error_code", "retryable", "run_status", "retry_count", "provider", "reused_order",
]);

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

function sanitizeParams(params: SeoEventParams): SeoEventParams {
  const safe: SeoEventParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (!ALLOWED_DIMENSIONS.has(key) || value == null) continue;
    if (key === "path") {
      if (typeof value === "string") safe.path = sanitizeMeasurementPath(value);
      continue;
    }
    if (typeof value === "string") {
      if (/https?:\/\//i.test(value) || value.includes("@")) continue;
      safe[key] = value.slice(0, 80);
    } else if (typeof value === "number" && Number.isFinite(value)) {
      safe[key] = value;
    } else if (typeof value === "boolean") {
      safe[key] = value;
    }
  }
  return safe;
}

export function trackSeoEvent(event: SeoEventName, params: SeoEventParams = {}): void {
  if (typeof window === "undefined") return;
  if (!hasConsent()) return;

  const payload = {
    ...sanitizeParams(params),
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
