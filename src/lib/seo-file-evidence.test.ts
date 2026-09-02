import { describe, expect, it, vi } from "vitest";
import { collectSeoFileEvidence } from "./seo-file-evidence";

describe("collectSeoFileEvidence", () => {
  it("classifies successful unlinked files as verified", async () => {
    const fetchResource = vi.fn().mockResolvedValue({ status: 200, body: "ok" });
    const result = await collectSeoFileEvidence("https://example.com", new AbortController().signal, fetchResource);

    expect(result.robots.status).toBe("VERIFIED");
    expect(result.sitemap.status).toBe("VERIFIED");
    expect(fetchResource).toHaveBeenCalledTimes(2);
  });

  it("preserves the final response authority after bounded redirects", async () => {
    const fetchResource = vi.fn()
      .mockResolvedValueOnce({ status: 200, body: "robots", finalUrl: "https://www.example.com/robots.txt" })
      .mockResolvedValueOnce({ status: 200, body: "sitemap", finalUrl: "https://cdn.example.net/sitemap.xml" });
    const result = await collectSeoFileEvidence("https://example.com", new AbortController().signal, fetchResource);

    expect(result.robots).toMatchObject({
      url: "https://example.com/robots.txt",
      finalUrl: "https://www.example.com/robots.txt",
      status: "VERIFIED",
    });
    expect(result.sitemap).toMatchObject({
      url: "https://example.com/sitemap.xml",
      finalUrl: "https://cdn.example.net/sitemap.xml",
      status: "VERIFIED",
    });
  });

  it("classifies 404 and 410 as verified missing", async () => {
    const fetchResource = vi.fn()
      .mockResolvedValueOnce({ status: 404, body: "missing" })
      .mockResolvedValueOnce({ status: 410, body: "gone" });
    const result = await collectSeoFileEvidence("https://example.com", new AbortController().signal, fetchResource);

    expect(result.robots).toMatchObject({ status: "MISSING", httpStatus: 404 });
    expect(result.sitemap).toMatchObject({ status: "MISSING", httpStatus: 410 });
  });

  it("keeps forbidden and failed probes unavailable", async () => {
    const fetchResource = vi.fn()
      .mockResolvedValueOnce({ status: 403, body: "forbidden" })
      .mockRejectedValueOnce(new Error("AUDIT_REQUEST_TIMEOUT"));
    const result = await collectSeoFileEvidence("https://example.com", new AbortController().signal, fetchResource);

    expect(result.robots).toMatchObject({ status: "UNAVAILABLE", httpStatus: 403 });
    expect(result.sitemap).toMatchObject({ status: "UNAVAILABLE", limitation: "AUDIT_REQUEST_TIMEOUT" });
  });
});
