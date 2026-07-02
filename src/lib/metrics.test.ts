import { describe, expect, it } from "vitest";
import {
  observeApiRequest,
  observeRumWebVital,
  observeRumError,
  renderPrometheusMetrics,
} from "./metrics";

describe("metrics", () => {
  it("observeApiRequest increments counters", () => {
    observeApiRequest("/api/test", 200, 50);
    const metrics = renderPrometheusMetrics();
    expect(metrics).toContain("audit_api_requests_total{route=\"/api/test\",status=\"200\"}");
    expect(metrics).toContain("audit_api_duration_sum{route=\"/api/test\"}");
    expect(metrics).toContain("audit_api_duration_count{route=\"/api/test\"}");
  });

  it("observeRumWebVital records valid metrics", () => {
    observeRumWebVital("LCP", 2500);
    const metrics = renderPrometheusMetrics();
    expect(metrics).toContain("audit_rum_web_vital_total{metric=\"LCP\"}");
    expect(metrics).toContain("audit_rum_web_vital_sum{metric=\"LCP\"}");
  });

  it("observeRumWebVital ignores invalid metrics", () => {
    observeRumWebVital("INVALID_METRIC", 100);
    observeRumWebVital("LCP", -1);
    observeRumWebVital("LCP", 200000);
    const metrics = renderPrometheusMetrics();
    expect(metrics).not.toContain("INVALID_METRIC");
  });

  it("observeRumError records valid error types", () => {
    observeRumError("error");
    observeRumError("unhandledrejection");
    const metrics = renderPrometheusMetrics();
    expect(metrics).toContain("audit_rum_js_error_total{type=\"error\"}");
    expect(metrics).toContain("audit_rum_js_error_total{type=\"unhandledrejection\"}");
  });

  it("observeRumError ignores unknown types", () => {
    observeRumError("unknown_type");
    const metrics = renderPrometheusMetrics();
    expect(metrics).not.toContain("unknown_type");
  });

  it("renderPrometheusMetrics returns prometheus format", () => {
    const metrics = renderPrometheusMetrics();
    expect(metrics).toContain("# HELP");
    expect(metrics).toContain("# TYPE");
    expect(metrics).toContain("\n");
  });
});
