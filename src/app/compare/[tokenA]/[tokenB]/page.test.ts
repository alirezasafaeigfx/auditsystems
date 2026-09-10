import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  cookieGet: vi.fn<(name: string) => { value: string } | undefined>(() => undefined),
}));

vi.mock("../../../../lib/db", () => ({ prisma: { reportShare: { findUnique: mocks.findUnique } } }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ get: mocks.cookieGet })) }));

function share(token: string, passwordHash: string | null) {
  return {
    token,
    passwordHash,
    revokedAt: null,
    expiresAt: null,
    run: {
      url: `https://${token}.invalid`,
      normalizedUrl: `https://${token}.invalid/`,
      summary: { score: 50, grade: "NEEDS_WORK", scoringPolicyVersion: "findings-v2" },
      findings: [{ code: `${token}-SECRET`, title: `${token} protected finding`, severity: "HIGH", category: "SECURITY" }],
    },
  };
}

describe("comparison access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("REPORT_ACCESS_SECRET", "synthetic-report-access-secret-for-tests");
    mocks.findUnique.mockImplementation(({ where }: { where: { token: string } }) => (
      where.token === "report-a" ? share("report-a", null) : share("report-b", "synthetic-hash")
    ));
  });

  it("does not disclose comparison data when either report is protected", async () => {
    const { default: ComparePage, dynamic, revalidate } = await import("./page");
    const markup = renderToStaticMarkup(await ComparePage({ params: Promise.resolve({ tokenA: "report-a", tokenB: "report-b" }) }));

    expect(markup).not.toContain("report-b.invalid");
    expect(markup).not.toContain("report-b protected finding");
    expect(dynamic).toBe("force-dynamic");
    expect(revalidate).toBe(0);
  });

  it("renders comparison data when the protected report session is valid", async () => {
    const { createReportAccessCredential, getReportAccessCookieName } = await import("../../../../lib/report-access");
    mocks.cookieGet.mockImplementation((name: string) => name === getReportAccessCookieName("report-b")
      ? { value: createReportAccessCredential("report-b") }
      : undefined);
    const { default: ComparePage } = await import("./page");
    const markup = renderToStaticMarkup(await ComparePage({ params: Promise.resolve({ tokenA: "report-a", tokenB: "report-b" }) }));

    expect(markup).toContain("report-b.invalid");
  });
});
