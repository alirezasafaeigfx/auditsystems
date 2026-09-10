import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), create: vi.fn(), logEvent: vi.fn() }));

vi.mock("./db", () => ({ prisma: {
  membership: { findFirst: mocks.findFirst },
  notificationHistory: { create: mocks.create },
} }));
vi.mock("./observability", () => ({ logEvent: mocks.logEvent }));

describe("audit completion notification coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CSRF_SECRET", "synthetic-notification-secret");
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    mocks.findFirst.mockResolvedValue({
      organization: { id: "org-1", name: "Synthetic org", notificationPreference: { emailEnabled: true } },
      user: { email: "synthetic@example.invalid", name: "Synthetic user" },
    });
    mocks.create.mockResolvedValue({});
  });

  it("renders unavailable category scores without a synthetic 100", async () => {
    const { sendAuditCompleteNotification } = await import("./notifications");
    await sendAuditCompleteNotification("user-1", {
      auditId: "audit-1", url: "https://synthetic.invalid", score: 100, grade: "EXCELLENT", totalFindings: 0,
      severityCounts: {}, categoryScores: { SEO: 100, PERFORMANCE: null, UX: null },
      resultAvailability: "PARTIAL", coverageRatio: 4 / 6,
    });

    const body = mocks.create.mock.calls[0][0].data.body as string;
    expect(body).toContain("Availability: PARTIAL");
    expect(body).toContain("PERFORMANCE: unavailable");
    expect(body).toContain("UX: unavailable");
    expect(body).not.toContain("PERFORMANCE: 100/100");
  });
});
