import { describe, it, expect } from "vitest";
import { getSampleReportCopy } from "../sample-report/copy";

const copyFa = getSampleReportCopy("fa");
const copyEn = getSampleReportCopy("en");

describe("sample report trust", () => {
  describe("FA copy", () => {
    it("has trust title and body", () => {
      expect(copyFa.trustTitle).toBeTruthy();
      expect(copyFa.trustBody).toBeTruthy();
    });

    it("trust body mentions demo/anonymized", () => {
      const body = copyFa.trustBody.toLowerCase();
      expect(body.includes("نمونه") || body.includes("آموزشی") || body.includes("demo")).toBe(true);
    });

    it("hero lead mentions anonymized", () => {
      expect(copyFa.heroLead.toLowerCase()).toContain("anonymized");
    });

    it("demo badge shows example domain", () => {
      expect(copyFa.demoBadge).toContain("anonymous-example.ir");
    });

    it("has all required copy keys", () => {
      expect(copyFa.trustTitle).toBeDefined();
      expect(copyFa.trustBody).toBeDefined();
      expect(copyFa.heroTitle).toBeDefined();
      expect(copyFa.heroLead).toBeDefined();
      expect(copyFa.demoBadge).toBeDefined();
      expect(copyFa.executiveSummary).toBeDefined();
      expect(copyFa.overallScore).toBeDefined();
      expect(copyFa.grade).toBeDefined();
      expect(copyFa.totalFindings).toBeDefined();
      expect(copyFa.nextSteps).toBeDefined();
    });

    it("has severity labels", () => {
      expect(copyFa.severityLabels.CRITICAL).toBeTruthy();
      expect(copyFa.severityLabels.HIGH).toBeTruthy();
      expect(copyFa.severityLabels.MEDIUM).toBeTruthy();
      expect(copyFa.severityLabels.LOW).toBeTruthy();
    });

    it("has category labels", () => {
      expect(copyFa.categoryLabels.seo).toBeTruthy();
      expect(copyFa.categoryLabels.performance).toBeTruthy();
      expect(copyFa.categoryLabels.security).toBeTruthy();
      expect(copyFa.categoryLabels.ux_mobile).toBeTruthy();
      expect(copyFa.categoryLabels.accessibility).toBeTruthy();
      expect(copyFa.categoryLabels.content).toBeTruthy();
    });
  });

  describe("EN copy", () => {
    it("has trust title and body", () => {
      expect(copyEn.trustTitle).toBeTruthy();
      expect(copyEn.trustBody).toBeTruthy();
    });

    it("trust body mentions demo/example", () => {
      const body = copyEn.trustBody.toLowerCase();
      expect(body.includes("demo") || body.includes("example") || body.includes("sample")).toBe(true);
    });

    it("hero lead mentions anonymized", () => {
      expect(copyEn.heroLead.toLowerCase()).toContain("anonymized");
    });

    it("has all required copy keys", () => {
      expect(copyEn.trustTitle).toBeDefined();
      expect(copyEn.trustBody).toBeDefined();
      expect(copyEn.heroTitle).toBeDefined();
      expect(copyEn.heroLead).toBeDefined();
      expect(copyEn.demoBadge).toBeDefined();
    });

    it("has severity labels in English", () => {
      expect(copyEn.severityLabels.CRITICAL).toBeTruthy();
      expect(copyEn.severityLabels.HIGH).toBeTruthy();
      expect(copyEn.severityLabels.MEDIUM).toBeTruthy();
    });

    it("has category labels in English", () => {
      expect(copyEn.categoryLabels.seo).toBeTruthy();
      expect(copyEn.categoryLabels.performance).toBeTruthy();
      expect(copyEn.categoryLabels.security).toBeTruthy();
    });
  });

  describe("consistency", () => {
    it("FA and EN have same trust keys", () => {
      expect(typeof copyFa.trustTitle).toBe(typeof copyEn.trustTitle);
    });

    it("severity label counts match", () => {
      expect(Object.keys(copyFa.severityLabels).length).toBe(
        Object.keys(copyEn.severityLabels).length
      );
    });

    it("category label counts match", () => {
      expect(Object.keys(copyFa.categoryLabels).length).toBe(
        Object.keys(copyEn.categoryLabels).length
      );
    });
  });
});
