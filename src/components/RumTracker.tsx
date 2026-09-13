"use client";

import { useEffect } from "react";
import { createClsSession } from "../lib/cls-session";

type RumTrackerProps = {
  locale: "fa" | "en";
};

const CONSENT_KEY = "asdev_analytics_consent";
const ENDPOINT = "/api/analytics/rum";

function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

function currentPath(): string {
  if (typeof window === "undefined") return "/";
  const path = window.location.pathname || "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function sendRum(payload: Record<string, unknown>): void {
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(ENDPOINT, blob);
      return;
    }

    if (typeof fetch === "function") {
      void fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
      });
    }
  } catch {
    // RUM must never break UI.
  }
}

export function formatRumMetricValue(metric: string, value: number): number {
  if (metric === "CLS") return Number(value.toFixed(4));
  return Number(value.toFixed(2));
}

export default function RumTracker({ locale }: RumTrackerProps) {
  useEffect(() => {
    if (!hasAnalyticsConsent()) {
      return;
    }

    const reportVital = (metric: string, value: number) => {
      if (!Number.isFinite(value) || value < 0) return;
      sendRum({
        type: "web_vital",
        metric,
        value: formatRumMetricValue(metric, value),
        path: currentPath(),
        locale,
      });
    };

    const reportError = (subtype: "error" | "unhandledrejection") => {
      sendRum({
        type: "js_error",
        subtype,
        path: currentPath(),
        locale,
      });
    };

    const clsSession = createClsSession();
    let lcpValue = 0;
    let sentLcp = false;
    let sentCls = false;
    let sentFcp = false;

    const onWindowError = () => {
      reportError("error");
    };
    const onUnhandledRejection = () => {
      reportError("unhandledrejection");
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    const paintObserver = new PerformanceObserver((list) => {
      if (sentFcp) return;
      const fcp = list.getEntries().find((entry) => entry.name === "first-contentful-paint");
      if (fcp) {
        sentFcp = true;
        reportVital("FCP", fcp.startTime);
      }
    });
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        clsSession.observe(shift.startTime, shift.value ?? 0, shift.hadRecentInput === true);
      }
    });
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        lcpValue = last.startTime;
      }
    });

    try {
      paintObserver.observe({ type: "paint", buffered: true });
    } catch {
      // ignore unsupported browser entries
    }
    try {
      clsObserver.observe({ type: "layout-shift", buffered: true });
    } catch {
      // ignore unsupported browser entries
    }
    try {
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      // ignore unsupported browser entries
    }

    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navigation) {
      reportVital("TTFB", navigation.responseStart - navigation.requestStart);
    }

    const flushFinalVitals = () => {
      if (!sentLcp && lcpValue > 0) {
        sentLcp = true;
        reportVital("LCP", lcpValue);
      }
      if (!sentCls) {
        sentCls = true;
        reportVital("CLS", clsSession.value());
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushFinalVitals();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flushFinalVitals);

    return () => {
      flushFinalVitals();
      paintObserver.disconnect();
      clsObserver.disconnect();
      lcpObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flushFinalVitals);
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [locale]);

  return null;
}
