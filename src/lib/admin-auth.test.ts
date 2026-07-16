import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  cookieGet: vi.fn(),
  cookieSet: vi.fn(),
  cookieDelete: vi.fn(),
  create: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    adminSession: {
      create: mocks.create,
      findUnique: mocks.findUnique,
      findMany: mocks.findMany,
      updateMany: mocks.updateMany,
    },
  },
}));

const originalEnv = { ...process.env };
const SESSION_ID = "11111111-2222-4333-8444-555555555555";
const TOKEN_SECRET = "ab".repeat(32);

beforeEach(() => {
  process.env = {
    ...originalEnv,
    ADMIN_USERNAME: "admin",
    ADMIN_PASSWORD: "secret123",
    ADMIN_SESSION_SECRET: "ab".repeat(32),
  };
  vi.clearAllMocks();
  mocks.cookies.mockResolvedValue({
    get: mocks.cookieGet,
    set: mocks.cookieSet,
    delete: mocks.cookieDelete,
  });
  mocks.create.mockResolvedValue({});
  mocks.findMany.mockResolvedValue([]);
  mocks.updateMany.mockResolvedValue({ count: 1 });
});

afterEach(() => {
  vi.unstubAllEnvs();
  process.env = originalEnv;
  vi.useRealTimers();
  vi.resetModules();
});

async function loadModule() {
  return import("./admin-auth");
}

describe("validateAdminCredentials", () => {
  it("returns true for correct credentials", async () => {
    const { validateAdminCredentials } = await loadModule();
    expect(validateAdminCredentials("admin", "secret123")).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const { validateAdminCredentials } = await loadModule();
    expect(validateAdminCredentials("admin", "wrong")).toBe(false);
  });

  it("returns false for wrong username", async () => {
    const { validateAdminCredentials } = await loadModule();
    expect(validateAdminCredentials("notadmin", "secret123")).toBe(false);
  });

  it("returns false when ADMIN_PASSWORD is empty", async () => {
    process.env.ADMIN_PASSWORD = "";
    const { validateAdminCredentials } = await loadModule();
    expect(validateAdminCredentials("admin", "")).toBe(false);
  });
});

describe("session configuration", () => {
  it("requires both signing secret and admin password", async () => {
    let mod = await loadModule();
    expect(mod.isSessionAuthConfigured()).toBe(true);

    vi.resetModules();
    delete process.env.ADMIN_SESSION_SECRET;
    mod = await loadModule();
    expect(mod.isSessionAuthConfigured()).toBe(false);

    vi.resetModules();
    process.env.ADMIN_SESSION_SECRET = "ab".repeat(32);
    delete process.env.ADMIN_PASSWORD;
    mod = await loadModule();
    expect(mod.isSessionAuthConfigured()).toBe(false);
  });

  it("rejects a signing secret shorter than 32 bytes", async () => {
    process.env.ADMIN_SESSION_SECRET = "too-short";
    const mod = await loadModule();
    expect(mod.isSessionAuthConfigured()).toBe(false);
    expect(() => mod.createSignedAdminSessionToken(SESSION_ID, TOKEN_SECRET)).toThrow(
      "ADMIN_SESSION_SECRET must contain at least 32 bytes",
    );
  });
});

describe("signed session token", () => {
  it("round-trips a valid HMAC token", async () => {
    const mod = await loadModule();
    const issuedAt = 1_700_000_000_000;
    const token = mod.createSignedAdminSessionToken(SESSION_ID, TOKEN_SECRET, issuedAt);
    const claims = mod.verifySignedAdminSessionToken(token, issuedAt + 1_000);
    expect(claims).toEqual({
      sessionId: SESSION_ID,
      issuedAt,
      tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  it("invalidates existing tokens after signing-secret rotation", async () => {
    const issuedAt = Date.now();
    const beforeRotation = await loadModule();
    const token = beforeRotation.createSignedAdminSessionToken(SESSION_ID, TOKEN_SECRET, issuedAt);

    process.env.ADMIN_SESSION_SECRET = "cd".repeat(32);
    vi.resetModules();
    const afterRotation = await loadModule();

    expect(afterRotation.verifySignedAdminSessionToken(token, issuedAt)).toBeNull();
  });

  it("rejects signature tampering", async () => {
    const mod = await loadModule();
    const now = Date.now();
    const token = mod.createSignedAdminSessionToken(SESSION_ID, TOKEN_SECRET, now);
    const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    expect(mod.verifySignedAdminSessionToken(tampered, now)).toBeNull();
  });

  it("rejects token-secret tampering", async () => {
    const mod = await loadModule();
    const now = Date.now();
    const token = mod.createSignedAdminSessionToken(SESSION_ID, TOKEN_SECRET, now);
    expect(mod.verifySignedAdminSessionToken(token.replace(TOKEN_SECRET, "cd".repeat(32)), now)).toBeNull();
  });

  it("rejects expired tokens", async () => {
    const mod = await loadModule();
    const issuedAt = 1_700_000_000_000;
    const token = mod.createSignedAdminSessionToken(SESSION_ID, TOKEN_SECRET, issuedAt);
    expect(mod.verifySignedAdminSessionToken(token, issuedAt + 24 * 60 * 60 * 1000 + 1)).toBeNull();
  });

  it("rejects tokens issued too far in the future", async () => {
    const mod = await loadModule();
    const now = 1_700_000_000_000;
    const token = mod.createSignedAdminSessionToken(SESSION_ID, TOKEN_SECRET, now + 60_001);
    expect(mod.verifySignedAdminSessionToken(token, now)).toBeNull();
  });

  it("rejects malformed versions and identifiers", async () => {
    const mod = await loadModule();
    const now = Date.now();
    const token = mod.createSignedAdminSessionToken(SESSION_ID, TOKEN_SECRET, now);
    expect(mod.verifySignedAdminSessionToken(token.replace(/^v1/, "v2"), now)).toBeNull();
    expect(mod.verifySignedAdminSessionToken(token.replace(SESSION_ID, "not-a-session"), now)).toBeNull();
  });
});

describe("server-side session lifecycle", () => {
  it("persists a hash and sets a secure production cookie", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const mod = await loadModule();
    const sessionId = await mod.createAdminSession();

    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        id: sessionId,
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        expiresAt: expect.any(Date),
      },
    });
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      "admin_session",
      expect.stringMatching(/^v1\./),
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 86_400,
        path: "/",
      }),
    );
  });

  it("accepts only a matching active database session", async () => {
    const mod = await loadModule();
    const now = Date.now();
    const token = mod.createSignedAdminSessionToken(SESSION_ID, TOKEN_SECRET, now);
    const claims = mod.verifySignedAdminSessionToken(token, now);
    expect(claims).not.toBeNull();

    mocks.cookieGet.mockReturnValue({ value: token });
    mocks.findUnique.mockResolvedValue({
      tokenHash: claims?.tokenHash,
      expiresAt: new Date(now + 60_000),
      revokedAt: null,
    });

    expect(await mod.validateAdminSession()).toBe(true);
  });

  it.each([
    ["missing", null],
    ["revoked", { tokenHash: "aa".repeat(32), expiresAt: new Date(Date.now() + 60_000), revokedAt: new Date() }],
    ["expired", { tokenHash: "aa".repeat(32), expiresAt: new Date(Date.now() - 1), revokedAt: null }],
    ["hash mismatch", { tokenHash: "aa".repeat(32), expiresAt: new Date(Date.now() + 60_000), revokedAt: null }],
  ])("rejects a %s database session", async (_label, databaseSession) => {
    const mod = await loadModule();
    const token = mod.createSignedAdminSessionToken(SESSION_ID, TOKEN_SECRET);
    mocks.cookieGet.mockReturnValue({ value: token });
    mocks.findUnique.mockResolvedValue(databaseSession);

    expect(await mod.validateAdminSession()).toBe(false);
  });

  it("rejects replay of the same token after server-side revocation", async () => {
    const mod = await loadModule();
    const now = Date.now();
    const token = mod.createSignedAdminSessionToken(SESSION_ID, TOKEN_SECRET, now);
    const claims = mod.verifySignedAdminSessionToken(token, now);
    mocks.cookieGet.mockReturnValue({ value: token });
    mocks.findUnique
      .mockResolvedValueOnce({
        tokenHash: claims?.tokenHash,
        expiresAt: new Date(now + 60_000),
        revokedAt: null,
      })
      .mockResolvedValueOnce({
        tokenHash: claims?.tokenHash,
        expiresAt: new Date(now + 60_000),
        revokedAt: new Date(now),
      });

    await expect(mod.validateAdminSession()).resolves.toBe(true);
    await expect(mod.validateAdminSession()).resolves.toBe(false);
  });

  it("revokes the current session during logout and always deletes the cookie", async () => {
    const mod = await loadModule();
    const token = mod.createSignedAdminSessionToken(SESSION_ID, TOKEN_SECRET);
    const claims = mod.verifySignedAdminSessionToken(token);
    mocks.cookieGet.mockReturnValue({ value: token });

    await mod.clearAdminSession();

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: SESSION_ID,
        tokenHash: claims?.tokenHash,
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
    expect(mocks.cookieDelete).toHaveBeenCalledWith("admin_session");
  });

  it("deletes the cookie even when database revocation fails", async () => {
    const mod = await loadModule();
    const token = mod.createSignedAdminSessionToken(SESSION_ID, TOKEN_SECRET);
    mocks.cookieGet.mockReturnValue({ value: token });
    mocks.updateMany.mockRejectedValue(new Error("database unavailable"));

    await expect(mod.clearAdminSession()).rejects.toThrow("database unavailable");
    expect(mocks.cookieDelete).toHaveBeenCalledWith("admin_session");
  });

  it("revokes one active session by identifier", async () => {
    const mod = await loadModule();
    mocks.updateMany.mockResolvedValue({ count: 1 });
    expect(await mod.revokeAdminSession(SESSION_ID)).toBe(true);
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: SESSION_ID, revokedAt: null }),
      }),
    );
  });

  it("revokes all active sessions and clears the current cookie", async () => {
    const mod = await loadModule();
    mocks.updateMany.mockResolvedValue({ count: 3 });
    expect(await mod.revokeAllAdminSessions()).toBe(3);
    expect(mocks.cookieDelete).toHaveBeenCalledWith("admin_session");
  });

  it("lists only active sessions without token hashes", async () => {
    const sessions = [{ id: SESSION_ID, createdAt: new Date(), expiresAt: new Date(), lastSeenAt: null }];
    mocks.findMany.mockResolvedValue(sessions);
    const mod = await loadModule();
    await expect(mod.listActiveAdminSessions()).resolves.toEqual(sessions);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { revokedAt: null, expiresAt: { gt: expect.any(Date) } },
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
          lastSeenAt: true,
        },
      }),
    );
  });
});
