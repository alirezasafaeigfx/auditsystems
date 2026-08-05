import type { AuditContext, Finding } from "./types";

const LEGACY_CWV_CODES = new Set([
  "CWV_LCP_POOR_PROXY",
  "CWV_FID_POOR_PROXY",
  "CWV_CLS_POOR_PROXY",
  "CWV_OVERALL_NEEDS_IMPROVEMENT",
  "CWV_OVERALL_GOOD_PROXY",
]);

function diagnosticEvidence(details: Record<string, unknown>) {
  return {
    evidenceClass: "HEURISTIC",
    source: "local-performance-diagnostics",
    limitations: ["This is a local risk indicator, not a Core Web Vitals measurement."],
    ...details,
  };
}

export function applyPerformanceEvidencePolicy(ctx: AuditContext, findings: Finding[]): Finding[] {
  const filtered = findings.filter((finding) => !LEGACY_CWV_CODES.has(String(finding.code)));
  const diagnostics: Finding[] = [];
  const responseMs = ctx.main.metrics?.responseMs ?? null;
  const blockingScripts = ctx.resources.filter((resource) =>
    resource.kind === "script"
    && resource.isThirdParty
    && resource.inHead === true
    && resource.attrs?.async !== true
    && resource.attrs?.defer !== true);
  const imagesWithoutDimensions = ctx.resources.filter((resource) =>
    (resource.kind === "img" || resource.kind === "image")
    && (!resource.attrs?.width || !resource.attrs?.height));

  if (responseMs !== null && responseMs > 2000 && ctx.resources.length > 50) {
    diagnostics.push({
      code: "PERF_DIAGNOSTIC_RENDER_PATH_RISK",
      category: "PERFORMANCE",
      severity: "HIGH",
      title: "Heavy initial render path diagnostic",
      recommendation: "Measure field and lab performance evidence, then reduce server response time and critical resource work.",
      evidence: diagnosticEvidence({ responseMs, resourceCount: ctx.resources.length }),
    });
  }

  if (blockingScripts.length > 3) {
    diagnostics.push({
      code: "PERF_DIAGNOSTIC_SCRIPT_BLOCKING_RISK",
      category: "PERFORMANCE",
      severity: "HIGH",
      title: "Blocking script risk diagnostic",
      recommendation: "Measure lab interactivity and reduce or defer non-critical third-party JavaScript.",
      evidence: diagnosticEvidence({ blockingScriptCount: blockingScripts.length }),
    });
  }

  if (imagesWithoutDimensions.length > 5) {
    diagnostics.push({
      code: "PERF_DIAGNOSTIC_LAYOUT_STABILITY_RISK",
      category: "PERFORMANCE",
      severity: "MEDIUM",
      title: "Layout stability risk diagnostic",
      recommendation: "Reserve image dimensions and verify layout stability with field and lab evidence.",
      evidence: diagnosticEvidence({ imagesWithoutDimensions: imagesWithoutDimensions.length }),
    });
  }

  return [...filtered, ...diagnostics];
}
