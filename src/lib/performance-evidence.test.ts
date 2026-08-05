import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPerformanceDiagnostics,
  collectPageSpeedStrategy,
  isPerformanceEvidenceStale,
} from "./performance-evidence";

const NOW = new Date("2026-08-05T12:00:00.000Z");

function pageSpeedPayload() {
  return {
    loadingExperience: {
      overall_category: "AVERAGE",
      metrics: {
        LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2200 },
        INTERACTION_TO_NEXT_PAINT: { percentile: 180 },
        CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 12 },
      },
    },
    lighthouseResult: {
      finalUrl: "https://www.example.com/final",
      fetchTime: "2026-08-05T11:59:30.000Z",
      categories: { performance: { score: 0.82 } },
      audits: {
        "largest-contentful-paint": { numericValue: 2450 },
        "cumulative-layout-shift": { numericValue: 0.09 },
        "first-contentful-paint": { numericValue: 1200 },
        "total-blocking-time": { numericValue: 210 },
      },
    },
  };
}

function partialPageSpeedPayload() {
  const payload = pageSpeedPayload();
  return {
    ...payload,
    loadingExperience: {
      ...payload.loadingExperience,
      metrics: {
        LARGEST_CONTENTFUL_PAINT_MS: payload.loadingExperience.metrics.LARGEST_CONTENTFUL_PAINT_MS,
        CUMULATIVE_LAYOUT_SHIFT_SCORE: payload.loadingExperience.metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE,
      },
    },
    lighthouseResult: {
      ...payload.lighthouseResult,
      audits: {
        "largest-contentful-paint": payload.lighthouseResult.audits["largest-contentful-paint"],
        "first-contentful-paint": payload.lighthouseResult.audits["first-contentful-paint"],
        "total-blocking-time": payload.lighthouseResult.audits["total-blocking-time"],
      },
    },
  };
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("PageSpeed performance evidence policy", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns unavailable without an API key and performs no network request", async () => {
    const fetchImpl = vi.fn();

    const result = await collectPageSpeedStrategy({
      requestedUrl: "https://example.com/",
      strategy: "mobile",
      apiKey: "",
      fetchImpl,
      now: NOW,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.status).toBe("UNAVAILABLE");
    expect(result.fieldMetrics.every((metric) => metric.evidenceClass === "UNAVAILABLE" && metric.value === null)).toBe(true);
    expect(result.labMetrics.every((metric) => metric.evidenceClass === "UNAVAILABLE" && metric.value === null)).toBe(true);
    expect(result.coverage).toEqual({ field: 0, lab: 0 });
    expect(result.confidence).toBe(0);
  });

  it("keeps CrUX field and Lighthouse lab evidence distinct", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(pageSpeedPayload()));

    const result = await collectPageSpeedStrategy({
      requestedUrl: "https://example.com/",
      strategy: "mobile",
      apiKey: "secret-provider-key",
      fetchImpl,
      now: NOW,
    });

    expect(result.status).toBe("SUCCESS");
    expect(result.finalUrl).toBe("https://www.example.com/final");
    expect(result.strategy).toBe("mobile");
    expect(result.fieldMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "lcp", value: 2200, unit: "ms", evidenceClass: "MEASURED", provider: "GOOGLE_CRUX" }),
      expect.objectContaining({ key: "inp", value: 180, unit: "ms", evidenceClass: "MEASURED", provider: "GOOGLE_CRUX" }),
      expect.objectContaining({ key: "cls", value: 0.12, unit: "score", evidenceClass: "MEASURED", provider: "GOOGLE_CRUX" }),
    ]));
    expect(result.labMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "lcp", value: 2450, evidenceClass: "OBSERVED", provider: "GOOGLE_LIGHTHOUSE", strategy: "mobile" }),
      expect.objectContaining({ key: "cls", value: 0.09, evidenceClass: "OBSERVED", provider: "GOOGLE_LIGHTHOUSE", strategy: "mobile" }),
      expect.objectContaining({ key: "tbt", value: 210, evidenceClass: "OBSERVED", provider: "GOOGLE_LIGHTHOUSE", strategy: "mobile" }),
    ]));
    expect(result.labMetrics.some((metric) => metric.key === "inp")).toBe(false);
    expect(JSON.stringify(result)).not.toContain("secret-provider-key");
  });

  it("keeps mobile and desktop cache and lab identities separate", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(pageSpeedPayload()));

    const mobile = await collectPageSpeedStrategy({
      requestedUrl: "https://example.com/",
      strategy: "mobile",
      apiKey: "key",
      fetchImpl,
      now: NOW,
    });
    const desktop = await collectPageSpeedStrategy({
      requestedUrl: "https://example.com/",
      strategy: "desktop",
      apiKey: "key",
      fetchImpl,
      now: NOW,
    });

    expect(mobile.cacheKey).not.toBe(desktop.cacheKey);
    expect(mobile.labMetrics.every((metric) => metric.strategy === "mobile")).toBe(true);
    expect(desktop.labMetrics.every((metric) => metric.strategy === "desktop")).toBe(true);
  });

  it("returns partial and null unavailable slots for incomplete payloads", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(partialPageSpeedPayload()));

    const result = await collectPageSpeedStrategy({
      requestedUrl: "https://example.com/",
      strategy: "mobile",
      apiKey: "key",
      fetchImpl,
      now: NOW,
    });

    expect(result.status).toBe("PARTIAL");
    expect(result.fieldMetrics).toContainEqual(expect.objectContaining({ key: "inp", value: null, evidenceClass: "UNAVAILABLE" }));
    expect(result.labMetrics).toContainEqual(expect.objectContaining({ key: "cls", value: null, evidenceClass: "UNAVAILABLE" }));
    expect(result.coverage.field).toBeLessThan(1);
    expect(result.coverage.lab).toBeLessThan(1);
  });

  it.each([
    [429, "RATE_LIMITED"],
    [401, "UNAUTHORIZED"],
    [403, "UNAUTHORIZED"],
    [503, "UNAVAILABLE"],
  ] as const)("maps HTTP %s to %s without metric values", async (status, expected) => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: "provider failure" }, status));

    const result = await collectPageSpeedStrategy({
      requestedUrl: "https://example.com/",
      strategy: "mobile",
      apiKey: "key",
      fetchImpl,
      now: NOW,
    });

    expect(result.status).toBe(expected);
    expect([...result.fieldMetrics, ...result.labMetrics].every((metric) => metric.value === null)).toBe(true);
  });

  it("maps aborts to timeout", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError"));

    const result = await collectPageSpeedStrategy({
      requestedUrl: "https://example.com/",
      strategy: "mobile",
      apiKey: "key",
      fetchImpl,
      now: NOW,
      timeoutMs: 10,
    });

    expect(result.status).toBe("TIMEOUT");
  });

  it("rejects invalid and oversized provider responses", async () => {
    const invalid = await collectPageSpeedStrategy({
      requestedUrl: "https://example.com/",
      strategy: "mobile",
      apiKey: "key",
      fetchImpl: vi.fn().mockResolvedValue(new Response("not-json", { status: 200 })),
      now: NOW,
    });
    expect(invalid.status).toBe("INVALID_RESPONSE");

    const oversizedBody = "x".repeat(2048);
    const oversized = await collectPageSpeedStrategy({
      requestedUrl: "https://example.com/",
      strategy: "mobile",
      apiKey: "key",
      fetchImpl: vi.fn().mockResolvedValue(new Response(oversizedBody, {
        status: 200,
        headers: { "content-length": String(oversizedBody.length) },
      })),
      now: NOW,
      maxResponseBytes: 1024,
    });
    expect(oversized.status).toBe("INVALID_RESPONSE");
  });

  it("marks evidence stale using deterministic expiration metadata", async () => {
    const result = await collectPageSpeedStrategy({
      requestedUrl: "https://example.com/",
      strategy: "mobile",
      apiKey: "key",
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse(pageSpeedPayload())),
      now: NOW,
    });

    expect(isPerformanceEvidenceStale(result, new Date("2026-08-05T17:59:59.000Z"))).toBe(false);
    expect(isPerformanceEvidenceStale(result, new Date("2026-08-05T18:00:01.000Z"))).toBe(true);
  });

  it("builds observed diagnostics without CWV metric keys", () => {
    const diagnostics = buildPerformanceDiagnostics({
      requestedUrl: "https://example.com/",
      finalUrl: "https://www.example.com/",
      collectedAt: NOW,
      responseMs: 1600,
      ttfbMs: 240,
      resourceCount: 84,
      blockingScriptCount: 4,
      imagesWithoutDimensions: 7,
    });

    expect(diagnostics.evidenceClass).toBe("OBSERVED");
    expect(diagnostics.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "response_ms", value: 1600 }),
      expect.objectContaining({ key: "ttfb_ms", value: 240 }),
      expect.objectContaining({ key: "resource_count", value: 84 }),
    ]));
    expect(diagnostics.metrics.some((metric) => ["lcp", "inp", "cls"].includes(metric.key))).toBe(false);
  });
});
