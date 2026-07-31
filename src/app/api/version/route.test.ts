import { afterEach, describe, expect, it, vi } from "vitest";

describe("GET /api/version", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns exact public-safe release metadata", async () => {
    vi.stubEnv("RELEASE_SHA", "A".repeat(40));
    vi.stubEnv("RELEASE_ID", "20260731T140000Z-gh-42");
    vi.stubEnv("RELEASE_BUILT_AT", "2026-07-31T14:00:00Z");

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toEqual({
      service: "auditsystems",
      configured: true,
      release: {
        commitSha: "a".repeat(40),
        releaseId: "20260731T140000Z-gh-42",
        builtAt: "2026-07-31T14:00:00.000Z",
      },
    });
  });

  it("fails closed without complete valid release metadata", async () => {
    vi.stubEnv("RELEASE_SHA", "not-a-sha");
    vi.stubEnv("RELEASE_ID", "unsafe release id");
    vi.stubEnv("RELEASE_BUILT_AT", "not-a-date");

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.configured).toBe(false);
    expect(body.release).toEqual({ commitSha: null, releaseId: null, builtAt: null });
  });

  it("keeps HEAD bodyless with the same status", async () => {
    vi.stubEnv("RELEASE_SHA", "b".repeat(40));
    vi.stubEnv("RELEASE_ID", "release-1");
    vi.stubEnv("RELEASE_BUILT_AT", "2026-07-31T14:00:00Z");

    const { HEAD } = await import("./route");
    const response = await HEAD();

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
  });
});
