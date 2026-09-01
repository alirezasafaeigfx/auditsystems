import type { PerformanceEvidenceBundle } from "./performance-evidence";
import type { Finding, SeoFileEvidence } from "./types";

export type AuditSummaryV1 = {
  schema: "asdev.audit.summary.v1";
  scoringPolicyVersion: "worst-severity-v2";
  generatedAt: string;
  run: {
    id: string;
    inputUrl: string;
    normalizedUrl: string;
    finalUrl?: string;
    depth: "QUICK" | "DEEP";
    status: "SUCCEEDED" | "FAILED";
    durationMs?: number;
  };
  dependencies: {
    firstPartyHosts: string[];
    thirdParty: {
      count: number;
      hosts: Array<{
        host: string;
        requestCount: number;
        kinds: Record<string, number>;
        examples: string[];
      }>;
    };
  };
  security: {
    headers: {
      csp: "present" | "missing";
      hsts: "present" | "missing";
      xContentTypeOptions: "present" | "missing";
      referrerPolicy: "present" | "missing";
      permissionsPolicy: "present" | "missing";
    };
  };
  seoBasics: {
    title: "present" | "missing";
    metaDescription: "present" | "missing";
    canonical: "present" | "missing";
    openGraph: "present" | "missing";
  };
  seoFiles?: {
    robots: SeoFileEvidence;
    sitemap: SeoFileEvidence;
  };
  performance?: PerformanceEvidenceBundle;
  findings: Finding[];
  highlights: {
    topFixes: Array<{
      code: string;
      impact: "HIGH" | "MEDIUM" | "LOW";
      effort: "LOW" | "MEDIUM" | "HIGH";
      why: string;
      steps: string[];
    }>;
  };
};
