import { AuditSummaryV1 } from "./summary.types";
import type { PerformanceEvidenceBundle } from "./performance-evidence";
import type { ExtractedResource, Finding, SeoBasics, SeoFileEvidence } from "./types";

function headerPresent(headers: Record<string, string>, headerName: string): boolean {
  return Object.keys(headers).some((key) => key.toLowerCase() === headerName.toLowerCase());
}

export function buildAuditSummaryV1(input: {
  runId: string;
  inputUrl: string;
  normalizedUrl: string;
  finalUrl?: string;
  depth: "QUICK" | "DEEP";
  durationMs?: number;
  headers: Record<string, string>;
  resources: ExtractedResource[];
  findings: Finding[];
  seo: SeoBasics;
  seoFiles?: { robots: SeoFileEvidence; sitemap: SeoFileEvidence };
  performance?: PerformanceEvidenceBundle;
}): AuditSummaryV1 {
  const firstPartyHost = new URL(input.normalizedUrl).hostname;

  const thirdPartyMap = new Map<string, { count: number; kinds: Record<string, number>; examples: string[] }>();
  for (const resource of input.resources) {
    if (!resource.isThirdParty) continue;
    const current = thirdPartyMap.get(resource.host) ?? { count: 0, kinds: {}, examples: [] };
    current.count += 1;
    current.kinds[resource.kind] = (current.kinds[resource.kind] ?? 0) + 1;
    if (current.examples.length < 4) current.examples.push(resource.url);
    thirdPartyMap.set(resource.host, current);
  }

  const topFixes: AuditSummaryV1["highlights"]["topFixes"] = input.findings
    .filter((f) => f.severity === "HIGH" || f.severity === "CRITICAL" || f.severity === "MEDIUM")
    .slice(0, 3)
    .map((f) => ({
      code: f.code,
      impact: f.severity === "HIGH" || f.severity === "CRITICAL" ? "HIGH" : "MEDIUM",
      effort: "MEDIUM",
      why: f.title,
      steps: [f.recommendation]
    }));

  return {
    schema: "asdev.audit.summary.v1",
    scoringPolicyVersion: "worst-severity-v2",
    generatedAt: new Date().toISOString(),
    run: {
      id: input.runId,
      inputUrl: input.inputUrl,
      normalizedUrl: input.normalizedUrl,
      finalUrl: input.finalUrl,
      depth: input.depth,
      status: "SUCCEEDED",
      durationMs: input.durationMs
    },
    dependencies: {
      firstPartyHosts: [firstPartyHost],
      thirdParty: {
        count: thirdPartyMap.size,
        hosts: Array.from(thirdPartyMap.entries()).map(([host, value]) => ({
          host,
          requestCount: value.count,
          kinds: value.kinds,
          examples: value.examples
        }))
      }
    },
    security: {
      headers: {
        csp: headerPresent(input.headers, "content-security-policy") ? "present" : "missing",
        hsts: headerPresent(input.headers, "strict-transport-security") ? "present" : "missing",
        xContentTypeOptions: headerPresent(input.headers, "x-content-type-options") ? "present" : "missing",
        referrerPolicy: headerPresent(input.headers, "referrer-policy") ? "present" : "missing",
        permissionsPolicy: headerPresent(input.headers, "permissions-policy") ? "present" : "missing"
      }
    },
    seoBasics: {
      title: input.seo.title ? "present" : "missing",
      metaDescription: input.seo.metaDescription ? "present" : "missing",
      canonical: input.seo.canonical ? "present" : "missing",
      openGraph: input.seo.openGraph ? "present" : "missing"
    },
    ...(input.seoFiles ? { seoFiles: input.seoFiles } : {}),
    ...(input.performance ? { performance: input.performance } : {}),
    findings: input.findings,
    highlights: {
      topFixes
    }
  };
}
