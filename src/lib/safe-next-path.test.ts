import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next-path";

describe("safeNextPath", () => {
  it("preserves an internal invite continuation path", () => {
    expect(safeNextPath("/app/team/accept?token=abc123")).toBe("/app/team/accept?token=abc123");
  });

  it("rejects external and protocol-relative redirects", () => {
    expect(safeNextPath("https://evil.example/steal")).toBe("/app");
    expect(safeNextPath("//evil.example/steal")).toBe("/app");
    expect(safeNextPath("/\\evil.example/steal")).toBe("/app");
  });

  it("rejects malformed or control-character paths", () => {
    expect(safeNextPath("javascript:alert(1)")).toBe("/app");
    expect(safeNextPath("/app\nSet-Cookie:x=y")).toBe("/app");
    expect(safeNextPath(null)).toBe("/app");
  });
});
