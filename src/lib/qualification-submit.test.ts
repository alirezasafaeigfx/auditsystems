import { describe, expect, it, vi } from "vitest";
import { submitQualification } from "./qualification-submit";

const payload = { domain: "https://example.com" };

describe("submitQualification", () => {
  it("returns a retryable error when the network rejects", async () => {
    const request = vi.fn().mockRejectedValue(new Error("offline"));

    await expect(submitQualification(payload, request)).resolves.toEqual({
      ok: false,
      code: "NETWORK_ERROR",
    });
  });

  it("returns a retryable error for a non-JSON response", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockRejectedValue(new SyntaxError("not json")),
    });

    await expect(submitQualification(payload, request)).resolves.toEqual({
      ok: false,
      code: "INVALID_RESPONSE",
    });
  });

  it("preserves an API validation error code", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "DOMAIN_REQUIRED" }),
    });

    await expect(submitQualification(payload, request)).resolves.toEqual({
      ok: false,
      code: "DOMAIN_REQUIRED",
    });
  });

  it("reports success only for an OK JSON response", async () => {
    const request = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: "lead-1" }),
    });

    await expect(submitQualification(payload, request)).resolves.toEqual({ ok: true });
  });
});
