import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("../../../../lib/db", () => ({
  prisma: {
    reportShare: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
  },
}));

vi.mock("../../../../lib/metrics", () => ({
  observeApiRequest: vi.fn(),
}));

vi.mock("../../../../lib/reportShare", () => ({
  isReportShareAccessible: (share: { revoked?: boolean }) => share && !share.revoked,
  hasPassword: (share: { passwordHash?: string }) => !!share?.passwordHash,
  verifyPassword: (pw: string) => pw === "correct-password",
}));

function makeShare(overrides: Record<string, unknown> = {}) {
  return {
    id: "share-1",
    token: "test-token",
    runId: "run-1",
    passwordHash: null,
    viewCount: 0,
    expiresAt: null,
    revoked: false,
    run: {
      id: "run-1",
      url: "https://example.com",
      normalizedUrl: "example.com",
      status: "SUCCEEDED",
      summary: "Test summary",
      findings: [],
    },
    ...overrides,
  };
}

describe("GET /api/reports/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.update.mockResolvedValue({});
  });

  it("returns 404 for missing share", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const { GET } = await import("./route");
    const req = new Request("https://test/api/reports/missing");
    const res = await GET(req, { params: Promise.resolve({ token: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("returns report data for unpassworded share", async () => {
    mocks.findUnique.mockResolvedValue(makeShare());
    const { GET } = await import("./route");
    const req = new Request("https://test/api/reports/test-token");
    const res = await GET(req, { params: Promise.resolve({ token: "test-token" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.run.id).toBe("run-1");
  });

  it("returns 401 PASSWORD_REQUIRED for passworded share without password", async () => {
    mocks.findUnique.mockResolvedValue(makeShare({ passwordHash: "hashed-pw" }));
    const { GET } = await import("./route");
    const req = new Request("https://test/api/reports/test-token");
    const res = await GET(req, { params: Promise.resolve({ token: "test-token" }) });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("PASSWORD_REQUIRED");
  });

  it("does NOT accept password from query parameter (F-005)", async () => {
    mocks.findUnique.mockResolvedValue(makeShare({ passwordHash: "hashed-pw" }));
    const { GET } = await import("./route");
    const req = new Request("https://test/api/reports/test-token?password=correct-password");
    const res = await GET(req, { params: Promise.resolve({ token: "test-token" }) });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/reports/[token] (F-005: password in body)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.update.mockResolvedValue({});
  });

  it("returns 404 for missing share", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const { POST } = await import("./route");
    const req = new Request("https://test/api/reports/missing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "pw" }),
    });
    const res = await POST(req, { params: Promise.resolve({ token: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("returns report data for unpassworded share via POST", async () => {
    mocks.findUnique.mockResolvedValue(makeShare());
    const { POST } = await import("./route");
    const req = new Request("https://test/api/reports/test-token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ token: "test-token" }) });
    expect(res.status).toBe(200);
  });

  it("returns 401 for wrong password in body", async () => {
    mocks.findUnique.mockResolvedValue(makeShare({ passwordHash: "hashed-pw" }));
    const { POST } = await import("./route");
    const req = new Request("https://test/api/reports/test-token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "wrong-password" }),
    });
    const res = await POST(req, { params: Promise.resolve({ token: "test-token" }) });
    expect(res.status).toBe(401);
  });

  it("returns report data with correct password in body", async () => {
    mocks.findUnique.mockResolvedValue(makeShare({ passwordHash: "hashed-pw" }));
    const { POST } = await import("./route");
    const req = new Request("https://test/api/reports/test-token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: "correct-password" }),
    });
    const res = await POST(req, { params: Promise.resolve({ token: "test-token" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.run.id).toBe("run-1");
  });

  it("returns 401 when no password provided for passworded share", async () => {
    mocks.findUnique.mockResolvedValue(makeShare({ passwordHash: "hashed-pw" }));
    const { POST } = await import("./route");
    const req = new Request("https://test/api/reports/test-token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req, { params: Promise.resolve({ token: "test-token" }) });
    expect(res.status).toBe(401);
  });
});
