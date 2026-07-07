import { describe, it, expect } from "vitest";
import { allFixtures, type AuditFixture } from "../fixtures/audit";
import { evaluateAuditRules } from "../lib/rules";
import { extractResourcesFromHtml } from "../lib/extractResources";
import { parseSeoBasics } from "../lib/seo";
import { calculateScore } from "../lib/scoring";

function runAudit(fixture: AuditFixture) {
  const url = new URL(fixture.url);
  const firstPartyHosts = new Set([url.hostname, `www.${url.hostname}`]);
  const resources = extractResourcesFromHtml(fixture.html, {
    baseUrl: fixture.url,
    firstPartyHosts,
  });
  const seo = parseSeoBasics(fixture.html);

  const findings = evaluateAuditRules({
    target: {
      normalizedUrl: fixture.url,
      origin: url.origin,
      host: url.hostname,
      protocol: "https:" as const,
      firstPartyHosts,
    },
    main: {
      finalUrl: fixture.url,
      status: 200,
      headers: { "content-type": "text/html" },
      html: fixture.html,
      metrics: { ttfbMs: 200, responseMs: 500 },
    },
    resources,
    seo,
  });

  const score = calculateScore(findings);

  return { findings, score, resources, seo };
}

describe("audit fixtures", () => {
  for (const fixture of allFixtures) {
    describe(fixture.name, () => {
      it("produces findings", () => {
        const { findings } = runAudit(fixture);
        expect(findings.length).toBeGreaterThan(0);
      });

      it("calculates a valid score", () => {
        const { score } = runAudit(fixture);
        expect(score.overall).toBeGreaterThanOrEqual(0);
        expect(score.overall).toBeLessThanOrEqual(100);
      });

      it("has valid category scores", () => {
        const { score } = runAudit(fixture);
        for (const catScore of Object.values(score.categories)) {
          expect(catScore).toBeGreaterThanOrEqual(0);
          expect(catScore).toBeLessThanOrEqual(100);
        }
      });

      it("findings have valid structure", () => {
        const { findings } = runAudit(fixture);
        for (const f of findings) {
          expect(f.code).toBeTruthy();
          expect(f.category).toBeTruthy();
          expect(f.severity).toBeTruthy();
          expect(f.title).toBeTruthy();
          expect(f.recommendation).toBeTruthy();
        }
      });
    });
  }
});
