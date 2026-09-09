import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class MockProjectCreateError extends Error {
    readonly code: string;
    readonly current?: number;
    readonly limit?: number;

    constructor(code: string, details: { current?: number; limit?: number } = {}) {
      super(code);
      this.name = "ProjectCreateError";
      this.code = code;
      this.current = details.current;
      this.limit = details.limit;
    }
  }

  return {
    ProjectCreateError: MockProjectCreateError,
    validateSession: vi.fn(),
    getOrganizationForUser: vi.fn(),
    csrfProtection: vi.fn(),
    normalizeAuditTargetUrl: vi.fn(),
    getCurrentPlan: vi.fn(),
    createProjectAtomically: vi.fn(),
    logEvent: vi.fn(),
  };
});

vi.mock("../../../lib/auth", () => ({
  validateSession: mocks.validateSession,
  getOrganizationForUser: mocks.getOrganizationForUser,
}));
vi.mock("../../../lib/csrf", () => ({ csrfProtection: mocks.csrfProtection }));
vi.mock("../../../lib/normalizeAuditTargetUrl", () => ({
  normalizeAuditTargetUrl: mocks.normalizeAuditTargetUrl,
}));
vi.mock("../../../lib/usage", () => ({ getCurrentPlan: mocks.getCurrentPlan }));
vi.mock("../../../lib/project-create", () => ({
  ProjectCreateError: mocks.ProjectCreateError,
  createProjectAtomically: mocks.createProjectAtomically,
}));
vi.mock("../../../lib/observability", () => ({
  createRequestId: () => "request-id",
  logEvent: mocks.logEvent,
  respondJson: (body: unknown, requestId: string, init?: ResponseInit) => {
    const response = NextResponse.json(body, init);
    response.headers.set("x-request-id", requestId);
    return response;
  },
}));

function request(body: BodyInit | undefined) {
  return new NextRequest("https://audit.example.com/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": "csrf" },
    body,
  });
}

function expectResponseMetadata(response: Response, status: number, retryAfter: string | null = null) {
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-request-id")).toBe("request-id");
  expect(response.headers.get("retry-after")).toBe(retryAfter);
}

describe("POST /api/projects", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.validateSession.mockResolvedValue({ id: "user-1" });
    mocks.getOrganizationForUser.mockResolvedValue({ organizationId: "org-1" });
    mocks.csrfProtection.mockResolvedValue({ valid: true });
    mocks.normalizeAuditTargetUrl.mockResolvedValue({
      host: "example.com",
      normalizedUrl: "https://example.com/",
    });
    mocks.getCurrentPlan.mockResolvedValue({ projectLimit: 1 });
    mocks.createProjectAtomically.mockResolvedValue({ id: "project-1" });
  });

  it("creates a normalized project through the atomic helper", async () => {
    const { POST } = await import("./route");

    const response = await POST(request(JSON.stringify({
      name: "  Example project  ",
      url: " https://example.com ",
    })));

    expectResponseMetadata(response, 201);
    expect(await response.json()).toEqual({ ok: true, projectId: "project-1", requestId: "request-id" });
    expect(mocks.getCurrentPlan).toHaveBeenCalledWith("org-1");
    expect(mocks.getCurrentPlan).toHaveBeenCalledTimes(1);
    expect(mocks.createProjectAtomically).toHaveBeenCalledTimes(1);
    expect(mocks.createProjectAtomically).toHaveBeenCalledWith({
      organizationId: "org-1",
      name: "Example project",
      domain: "example.com",
      normalizedUrl: "https://example.com/",
      projectLimit: 1,
    });
  });

  it("returns actionable usage details when the project limit is reached", async () => {
    mocks.createProjectAtomically.mockRejectedValue(new mocks.ProjectCreateError(
      "PROJECT_LIMIT_REACHED",
      { current: 1, limit: 1 },
    ));
    const { POST } = await import("./route");

    const response = await POST(request(JSON.stringify({ name: "Example", url: "https://example.com" })));

    expectResponseMetadata(response, 403);
    expect(await response.json()).toEqual({
      error: "PROJECT_LIMIT_REACHED",
      usage: { current: 1, limit: 1 },
      upgradeUrl: "/app/billing",
      requestId: "request-id",
    });
  });

  it("returns a retryable response when serializable creation retries are exhausted", async () => {
    mocks.createProjectAtomically.mockRejectedValue(new mocks.ProjectCreateError("PROJECT_CREATE_RETRY_EXHAUSTED"));
    const { POST } = await import("./route");

    const response = await POST(request(JSON.stringify({ name: "Example", url: "https://example.com" })));

    expectResponseMetadata(response, 503, "1");
    expect(await response.json()).toEqual({ error: "PROJECT_CREATE_RETRY_EXHAUSTED", requestId: "request-id" });
    expect(mocks.logEvent).toHaveBeenCalledWith("warn", "project_create_retry_exhausted", { requestId: "request-id", orgId: "org-1" });
  });

  it("logs unexpected failures without exposing their details", async () => {
    mocks.createProjectAtomically.mockRejectedValue(new Error("database connection details"));
    const { POST } = await import("./route");

    const response = await POST(request(JSON.stringify({ name: "Example", url: "https://example.com" })));
    const body = await response.json();

    expectResponseMetadata(response, 500);
    expect(body).toEqual({ error: "INTERNAL_ERROR", requestId: "request-id" });
    expect(JSON.stringify(body)).not.toContain("database connection details");
    expect(mocks.logEvent).toHaveBeenCalledWith("error", "project_create_failed", {
      requestId: "request-id",
      error: "database connection details",
    });
  });

  it("rejects unauthenticated requests", async () => {
    mocks.validateSession.mockResolvedValue(null);
    const { POST } = await import("./route");

    const response = await POST(request(JSON.stringify({ name: "Example", url: "https://example.com" })));

    expectResponseMetadata(response, 401);
    expect(await response.json()).toEqual({ error: "UNAUTHORIZED", requestId: "request-id" });
  });

  it("rejects requests that fail CSRF protection", async () => {
    mocks.csrfProtection.mockResolvedValue({ valid: false });
    const { POST } = await import("./route");

    const response = await POST(request(JSON.stringify({ name: "Example", url: "https://example.com" })));

    expectResponseMetadata(response, 403);
    expect(await response.json()).toEqual({ error: "FORBIDDEN", requestId: "request-id" });
  });

  it("rejects malformed JSON", async () => {
    const { POST } = await import("./route");

    const response = await POST(request("{"));

    expectResponseMetadata(response, 400);
    expect(await response.json()).toEqual({ error: "INVALID_JSON", requestId: "request-id" });
  });

  it("rejects non-object payloads", async () => {
    const { POST } = await import("./route");

    const response = await POST(request(JSON.stringify(null)));

    expectResponseMetadata(response, 400);
    expect(await response.json()).toEqual({ error: "INVALID_PAYLOAD", requestId: "request-id" });
  });

  it("rejects invalid project names", async () => {
    const { POST } = await import("./route");

    const response = await POST(request(JSON.stringify({ name: " ", url: "https://example.com" })));

    expectResponseMetadata(response, 400);
    expect(await response.json()).toEqual({ error: "INVALID_NAME", requestId: "request-id" });
  });

  it("rejects missing project URLs", async () => {
    const { POST } = await import("./route");

    const response = await POST(request(JSON.stringify({ name: "Example", url: " " })));

    expectResponseMetadata(response, 400);
    expect(await response.json()).toEqual({ error: "INVALID_URL", requestId: "request-id" });
  });

  it("rejects URLs that cannot be normalized", async () => {
    mocks.normalizeAuditTargetUrl.mockRejectedValue(new Error("invalid URL"));
    const { POST } = await import("./route");

    const response = await POST(request(JSON.stringify({ name: "Example", url: "https://localhost" })));

    expectResponseMetadata(response, 400);
    expect(await response.json()).toEqual({ error: "INVALID_URL_FORMAT", requestId: "request-id" });
  });

  it("rejects authenticated users without an organization membership", async () => {
    mocks.getOrganizationForUser.mockResolvedValue(null);
    const { POST } = await import("./route");

    const response = await POST(request(JSON.stringify({ name: "Example", url: "https://example.com" })));

    expectResponseMetadata(response, 400);
    expect(await response.json()).toEqual({ error: "NO_ORGANIZATION", requestId: "request-id" });
    expect(mocks.getCurrentPlan).not.toHaveBeenCalled();
    expect(mocks.createProjectAtomically).not.toHaveBeenCalled();
  });

  it("falls back to the sanitized internal error contract for malformed quota errors", async () => {
    mocks.createProjectAtomically.mockRejectedValue(new mocks.ProjectCreateError("PROJECT_LIMIT_REACHED", {
      current: 3,
    }));
    const { POST } = await import("./route");

    const response = await POST(request(JSON.stringify({ name: "Example", url: "https://example.com" })));

    expectResponseMetadata(response, 500);
    expect(await response.json()).toEqual({ error: "INTERNAL_ERROR", requestId: "request-id" });
    expect(mocks.logEvent).toHaveBeenCalledWith("error", "project_create_failed", {
      requestId: "request-id",
      error: "PROJECT_LIMIT_REACHED",
    });
  });
});
