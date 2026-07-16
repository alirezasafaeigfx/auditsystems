import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validateAdminSession: vi.fn(),
  listActiveAdminSessions: vi.fn(),
  revokeAdminSession: vi.fn(),
  csrfProtection: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  validateAdminSession: mocks.validateAdminSession,
  listActiveAdminSessions: mocks.listActiveAdminSessions,
  revokeAdminSession: mocks.revokeAdminSession,
}));

vi.mock("@/lib/csrf", () => ({
  csrfProtection: mocks.csrfProtection,
}));

const SESSION_ID = "11111111-2222-4333-8444-555555555555";

describe("/api/admin/auth/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateAdminSession.mockResolvedValue(true);
    mocks.listActiveAdminSessions.mockResolvedValue([]);
    mocks.revokeAdminSession.mockResolvedValue(true);
    mocks.csrfProtection.mockResolvedValue({ valid: true });
  });

  it("rejects unauthenticated listing", async () => {
    mocks.validateAdminSession.mockResolvedValue(false);
    const { GET } = await import("./route");
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("lists active sessions", async () => {
    const sessions = [{ id: SESSION_ID, createdAt: new Date(), expiresAt: new Date(), lastSeenAt: null }];
    mocks.listActiveAdminSessions.mockResolvedValue(sessions);
    const { GET } = await import("./route");
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      sessions: sessions.map((session) => ({
        ...session,
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      })),
    });
  });

  it("requires authentication before revocation", async () => {
    mocks.validateAdminSession.mockResolvedValue(false);
    const { DELETE } = await import("./route");
    const request = new NextRequest("http://localhost/api/admin/auth/sessions", {
      method: "DELETE",
      body: JSON.stringify({ sessionId: SESSION_ID }),
      headers: { "content-type": "application/json" },
    });
    const response = await DELETE(request);
    expect(response.status).toBe(401);
    expect(mocks.csrfProtection).not.toHaveBeenCalled();
  });

  it("requires CSRF for individual revocation", async () => {
    mocks.csrfProtection.mockResolvedValue({ valid: false, error: "CSRF token missing" });
    const { DELETE } = await import("./route");
    const request = new NextRequest("http://localhost/api/admin/auth/sessions", {
      method: "DELETE",
      body: JSON.stringify({ sessionId: SESSION_ID }),
      headers: { "content-type": "application/json" },
    });
    const response = await DELETE(request);
    expect(response.status).toBe(403);
  });

  it("rejects malformed session identifiers", async () => {
    const { DELETE } = await import("./route");
    const request = new NextRequest("http://localhost/api/admin/auth/sessions", {
      method: "DELETE",
      body: JSON.stringify({ sessionId: "-".repeat(36) }),
      headers: { "content-type": "application/json" },
    });
    const response = await DELETE(request);
    expect(response.status).toBe(400);
    expect(mocks.revokeAdminSession).not.toHaveBeenCalled();
  });

  it("returns 404 for an inactive session", async () => {
    mocks.revokeAdminSession.mockResolvedValue(false);
    const { DELETE } = await import("./route");
    const request = new NextRequest("http://localhost/api/admin/auth/sessions", {
      method: "DELETE",
      body: JSON.stringify({ sessionId: SESSION_ID }),
      headers: { "content-type": "application/json" },
    });
    const response = await DELETE(request);
    expect(response.status).toBe(404);
  });

  it("revokes one active session", async () => {
    const { DELETE } = await import("./route");
    const request = new NextRequest("http://localhost/api/admin/auth/sessions", {
      method: "DELETE",
      body: JSON.stringify({ sessionId: SESSION_ID }),
      headers: { "content-type": "application/json" },
    });
    const response = await DELETE(request);
    expect(response.status).toBe(200);
    expect(mocks.revokeAdminSession).toHaveBeenCalledWith(SESSION_ID);
  });
});
