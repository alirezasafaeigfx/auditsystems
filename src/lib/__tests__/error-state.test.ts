import { describe, it, expect } from "vitest";

describe("error page module", () => {
  it("error.tsx exists and is valid module", async () => {
    const mod = await import("../../app/error");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });

  it("global-error.tsx exists and is valid module", async () => {
    const mod = await import("../../app/global-error");
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("function");
  });
});

describe("analytics", () => {
  it("trackSeoEvent exists as function", async () => {
    const { trackSeoEvent } = await import("../analytics");
    expect(typeof trackSeoEvent).toBe("function");
  });
});

describe("rules engine", () => {
  it("rules module exports evaluateAuditRules", async () => {
    const mod = await import("../rules");
    expect(typeof mod.evaluateAuditRules).toBe("function");
  });
});

describe("report share", () => {
  it("isReportShareAccessible exists", async () => {
    const mod = await import("../reportShare");
    expect(typeof mod.isReportShareAccessible).toBe("function");
  });
});

describe("health", () => {
  it("health check function exists", async () => {
    const mod = await import("../health");
    expect(mod).toBeDefined();
  });
});
