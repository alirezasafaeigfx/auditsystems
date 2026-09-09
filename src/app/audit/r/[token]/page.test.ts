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
    expect(mocks.update).toHaveBeenCalledTimes(1);
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
});
