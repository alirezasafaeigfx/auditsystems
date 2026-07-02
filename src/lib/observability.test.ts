import { describe, expect, it } from "vitest";
import { createRequestId, logEvent } from "./observability";

describe("createRequestId", () => {
  it("generates a 32-character hex string", () => {
    const id = createRequestId();
    expect(id).toMatch(/^[a-f0-9]{32}$/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 50 }, () => createRequestId()));
    expect(ids.size).toBe(50);
  });
});

describe("logEvent", () => {
  it("does not throw for any log level", () => {
    expect(() => logEvent("info", "test_event", { key: "value" })).not.toThrow();
    expect(() => logEvent("warn", "test_event", { key: "value" })).not.toThrow();
    expect(() => logEvent("error", "test_event", { key: "value" })).not.toThrow();
  });
});
