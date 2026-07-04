import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
  vi.resetModules();
});

async function loadModule() {
  const mod = await import("./admin-auth");
  return { validateAdminCredentials: mod.validateAdminCredentials, isSessionAuthConfigured: mod.isSessionAuthConfigured };
}

describe("validateAdminCredentials", () => {
  it("returns true for correct credentials", async () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "secret123";
    const { validateAdminCredentials } = await loadModule();
    expect(validateAdminCredentials("admin", "secret123")).toBe(true);
  });

  it("returns false for wrong password", async () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "secret123";
    const { validateAdminCredentials } = await loadModule();
    expect(validateAdminCredentials("admin", "wrong")).toBe(false);
  });

  it("returns false for wrong username", async () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "secret123";
    const { validateAdminCredentials } = await loadModule();
    expect(validateAdminCredentials("notadmin", "secret123")).toBe(false);
  });

  it("returns false when ADMIN_PASSWORD is empty", async () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "";
    const { validateAdminCredentials } = await loadModule();
    expect(validateAdminCredentials("admin", "")).toBe(false);
  });

  it("returns false when ADMIN_PASSWORD is not set", async () => {
    process.env.ADMIN_USERNAME = "admin";
    delete process.env.ADMIN_PASSWORD;
    const { validateAdminCredentials } = await loadModule();
    expect(validateAdminCredentials("admin", "any")).toBe(false);
  });
});

describe("isSessionAuthConfigured", () => {
  it("returns true when both ADMIN_SESSION_SECRET and ADMIN_PASSWORD are set", async () => {
    process.env.ADMIN_SESSION_SECRET = "s3cret";
    process.env.ADMIN_PASSWORD = "pass";
    const { isSessionAuthConfigured } = await loadModule();
    expect(isSessionAuthConfigured()).toBe(true);
  });

  it("returns false when ADMIN_SESSION_SECRET is missing", async () => {
    delete process.env.ADMIN_SESSION_SECRET;
    process.env.ADMIN_PASSWORD = "pass";
    const { isSessionAuthConfigured } = await loadModule();
    expect(isSessionAuthConfigured()).toBe(false);
  });

  it("returns false when ADMIN_PASSWORD is missing", async () => {
    process.env.ADMIN_SESSION_SECRET = "s3cret";
    delete process.env.ADMIN_PASSWORD;
    const { isSessionAuthConfigured } = await loadModule();
    expect(isSessionAuthConfigured()).toBe(false);
  });

  it("returns false when both are missing", async () => {
    delete process.env.ADMIN_SESSION_SECRET;
    delete process.env.ADMIN_PASSWORD;
    const { isSessionAuthConfigured } = await loadModule();
    expect(isSessionAuthConfigured()).toBe(false);
  });

  it("returns false when ADMIN_SESSION_SECRET is empty string", async () => {
    process.env.ADMIN_SESSION_SECRET = "";
    process.env.ADMIN_PASSWORD = "pass";
    const { isSessionAuthConfigured } = await loadModule();
    expect(isSessionAuthConfigured()).toBe(false);
  });

  it("returns false when ADMIN_PASSWORD is empty string", async () => {
    process.env.ADMIN_SESSION_SECRET = "s3cret";
    process.env.ADMIN_PASSWORD = "";
    const { isSessionAuthConfigured } = await loadModule();
    expect(isSessionAuthConfigured()).toBe(false);
  });
});
