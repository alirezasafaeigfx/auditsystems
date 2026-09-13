import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  cookieGet: vi.fn(() => undefined as { value: string } | undefined),
}));

vi.mock("../../../../lib/db", () => ({
  prisma: {
    reportShare: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mocks.cookieGet })),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

function protectedShare() {
  return {
    token: "protected-report-token",
    passwordHash: "synthetic-password-hash",
    revokedAt: null,
    expiresAt: null,
    viewCount: 0,
    run: {
      id: "synthetic-run",
      url: "https://private-customer.invalid",
      normalizedUrl: "https://private-customer.invalid/",
      status: "SUCCEEDED",
      summary: { score: 41, grade: "NEEDS_WORK" },
      findings: [{
        id: "finding-1",
        code: "SYNTHETIC_SECRET_FINDING",
        title: "Synthetic protected finding",
        description: "Synthetic protected body",
        recommendation: "Synthetic protected recommendation",
        severity: "HIGH",
        category: "SECURITY",
      }],
    },
  };
}

describe("protected report HTML/RSC access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("REPORT_ACCESS_SECRET", "synthetic-report-access-secret-for-tests");
    mocks.findUnique.mockResolvedValue(protectedShare());
    mocks.update.mockResolvedValue({});
  });

  it("does not render protected report content before authorization", async () => {
    const { default: ReportPage, dynamic, revalidate } = await import("./page");
    const markup = renderToStaticMarkup(await ReportPage({
      params: Promise.resolve({ token: "protected-report-token" }),
    }));

    expect(markup).not.toContain("private-customer.invalid");
    expect(markup).not.toContain("Synthetic protected finding");
    expect(markup).not.toContain("SYNTHETIC_SECRET_FINDING");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(dynamic).toBe("force-dynamic");
    expect(revalidate).toBe(0);
  });

  it("does not render protected report content on the English surface", async () => {
    const { default: ReportPageEn } = await import("../../../en/audit/r/[token]/page");
    const markup = renderToStaticMarkup(await ReportPageEn({
      params: Promise.resolve({ token: "protected-report-token" }),
    }));

    expect(markup).not.toContain("private-customer.invalid");
    expect(markup).not.toContain("Synthetic protected finding");
    expect(markup).toContain("This report is protected");
  });

  it("renders a public legacy report without a session", async () => {
    mocks.findUnique.mockResolvedValue(protectedShare());
    mocks.findUnique.mockResolvedValue({ ...protectedShare(), passwordHash: null });
    const { default: ReportPage } = await import("./page");
    const markup = renderToStaticMarkup(await ReportPage({ params: Promise.resolve({ token: "protected-report-token" }) }));

    expect(markup).toContain("Synthetic protected finding");
  });

  it("renders a protected report after a valid report-bound session", async () => {
    const { createReportAccessCredential } = await import("../../../../lib/report-access");
    mocks.cookieGet.mockReturnValue({ value: createReportAccessCredential("protected-report-token") });
    const { default: ReportPage } = await import("./page");
    const markup = renderToStaticMarkup(await ReportPage({ params: Promise.resolve({ token: "protected-report-token" }) }));

    expect(markup).toContain("Synthetic protected finding");
    expect(markup).toContain("برای اجرای اصلاحات کمک می‌خواهم");
    expect(markup).toContain("utm_content=report_implementation");
    expect(markup).toContain('href="https://alirezasafaeisystems.ir/qualification?utm_source=audit&amp;utm_medium=report&amp;utm_campaign=asdev_audit&amp;utm_content=report_implementation"');
    const { default: ReportPageEn } = await import("../../../en/audit/r/[token]/page");
    const englishMarkup = renderToStaticMarkup(await ReportPageEn({ params: Promise.resolve({ token: "protected-report-token" }) }));
    expect(englishMarkup).toContain("Get help implementing fixes");
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it("does not present findings from a failed run as confirmed in either language", async () => {
    const share = protectedShare();
    (share as { passwordHash: string | null }).passwordHash = null;
    share.run.status = "FAILED";
    share.run.normalizedUrl = `https://private-customer.invalid/${"a".repeat(180)}`;
    mocks.findUnique.mockResolvedValue(share);

    const { default: ReportPage } = await import("./page");
    const { default: ReportPageEn } = await import("../../../en/audit/r/[token]/page");
    const params = Promise.resolve({ token: "protected-report-token" });
    const persian = renderToStaticMarkup(await ReportPage({ params }));
    const english = renderToStaticMarkup(await ReportPageEn({ params }));

    expect(persian).toContain("امتیاز در دسترس نیست");
    expect(english).toContain("Score unavailable");
    expect(persian).toContain(">ناموفق</span>");
    expect(english).toContain(">Failed</span>");
    expect(persian).toContain("ممیزی با موفقیت کامل نشد.");
    expect(persian).not.toContain("The audit did not complete successfully.");
    expect(persian).toContain('dir="ltr" style="overflow-wrap:anywhere"');
    expect(english).toContain('dir="ltr" style="overflow-wrap:anywhere"');
    expect(persian).not.toContain("Synthetic protected finding");
    expect(english).not.toContain("Synthetic protected finding");
    expect(persian).not.toContain("نقشه اقدام");
    expect(persian).not.toContain("فعال‌سازی تحویل کامل");
    expect(english).not.toContain("Unlock Full Delivery");
    expect(english).not.toContain("Get help implementing fixes");
  });

  it.each(["QUEUED", "RUNNING"])("describes a %s report as pending, not failed", async (status) => {
    const share = protectedShare();
    (share as { passwordHash: string | null }).passwordHash = null;
    share.run.status = status;
    mocks.findUnique.mockResolvedValue(share);
    const { default: ReportPage } = await import("./page");
    const { default: ReportPageEn } = await import("../../../en/audit/r/[token]/page");
    const markup = renderToStaticMarkup(await ReportPage({ params: Promise.resolve({ token: "protected-report-token" }) }));
    const english = renderToStaticMarkup(await ReportPageEn({ params: Promise.resolve({ token: "protected-report-token" }) }));

    expect(markup).toContain("ممیزی هنوز کامل نشده است.");
    expect(markup).not.toContain("ممیزی با موفقیت کامل نشد.");
    expect(english).toContain("The audit is still in progress.");
    expect(english).not.toContain("The audit did not complete successfully.");
  });

  it.each([
    { revokedAt: new Date(), expiresAt: null },
    { revokedAt: null, expiresAt: new Date("2000-01-01T00:00:00.000Z") },
  ])("does not render unavailable report content for $revokedAt $expiresAt", async (availability) => {
    mocks.findUnique.mockResolvedValue({ ...protectedShare(), ...availability });
    const { default: ReportPage } = await import("./page");
    const markup = renderToStaticMarkup(await ReportPage({ params: Promise.resolve({ token: "protected-report-token" }) }));

    expect(markup).not.toContain("Synthetic protected finding");
    expect(markup).not.toContain("private-customer.invalid");
  });

  it("labels a current partial result and does not present missing performance coverage as 100", async () => {
    const share = protectedShare();
    (share as { passwordHash: string | null }).passwordHash = null;
    share.run.findings = [];
    share.run.summary = {
      schema: "asdev.audit.summary.v1",
      scoringPolicyVersion: "worst-severity-v2",
      score: 100,
      grade: "EXCELLENT",
      categoryScores: { SEO: 100, PERFORMANCE: 100, SECURITY: 100, UX: 100, ACCESSIBILITY: 100, RESILIENCE: 100 },
      severityCounts: { INFO: 0, LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      seoFiles: { robots: { status: "VERIFIED" }, sitemap: { status: "VERIFIED" } },
      resultCoverage: {
        schema: "asdev.audit.result-coverage.v1",
        coveredCategories: ["SEO", "SECURITY", "ACCESSIBILITY", "RESILIENCE"],
        unavailableCategories: ["PERFORMANCE", "UX"],
        ratio: 4 / 6,
        confidence: 4 / 6,
        freshness: "FRESH",
        measurementIds: ["category:SEO", "category:SECURITY", "category:ACCESSIBILITY", "category:RESILIENCE"],
        limitations: ["Performance score withheld."],
      },
    } as never;
    mocks.findUnique.mockResolvedValue(share);

    const { default: ReportPage } = await import("./page");
    const markup = renderToStaticMarkup(await ReportPage({ params: Promise.resolve({ token: "protected-report-token" }) }));
    const { default: ReportPageEn } = await import("../../../en/audit/r/[token]/page");
    const englishMarkup = renderToStaticMarkup(await ReportPageEn({ params: Promise.resolve({ token: "protected-report-token" }) }));

    expect(markup).toContain("نتیجه ناقص");
    expect(markup).toContain("67%");
    expect(markup).not.toContain("سرعت</div><div style=\"font-size:1.25rem;font-weight:700\">100");
    expect(englishMarkup).toContain("Partial result");
    expect(markup).toContain(">عالی</div>");
    expect(englishMarkup).toContain("(Excellent)");
    expect(englishMarkup).toContain("67%");
    expect(englishMarkup).not.toContain("Performance</div><div style=\"font-size:1.25rem;font-weight:700\">100");

    (share.run.summary as unknown as { resultCoverage: { freshness: string } }).resultCoverage.freshness = "STALE_BLOCKED";
    const staleMarkup = renderToStaticMarkup(await ReportPage({ params: Promise.resolve({ token: "protected-report-token" }) }));
    expect(staleMarkup).toContain("شواهد اندازه‌گیری قدیمی است و امتیاز نمایش داده نمی‌شود.");
    expect(staleMarkup).not.toContain("Measurement evidence is stale and blocked.");
  });

  it("explains an invalid stored summary without exposing English diagnostics", async () => {
    const share = protectedShare();
    (share as { passwordHash: string | null }).passwordHash = null;
    share.run.summary = null as never;
    mocks.findUnique.mockResolvedValue(share);
    const { default: ReportPage } = await import("./page");
    const markup = renderToStaticMarkup(await ReportPage({ params: Promise.resolve({ token: "protected-report-token" }) }));

    expect(markup).toContain("داده‌های ثبت‌شده برای نمایش امتیاز معتبر نیستند.");
    expect(markup).not.toContain("The stored result summary is missing or malformed.");
  });
});
