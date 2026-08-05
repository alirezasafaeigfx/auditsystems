import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { fetchAuditHtml } from "./safeAuditFetch";

describe("fetchAuditHtml performance timing evidence", () => {
  let server: Server;
  let url: string;

  beforeAll(async () => {
    vi.stubEnv("AUDIT_ALLOW_LOCAL_FIXTURE", "true");
    server = createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.write("<html><body>");
      setTimeout(() => response.end("complete</body></html>"), 120);
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address() as AddressInfo;
    url = `http://127.0.0.1:${address.port}/timing`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    vi.unstubAllEnvs();
  });

  it("measures header-arrival TTFB separately from total bounded body time", async () => {
    const response = await fetchAuditHtml(url, new AbortController().signal);

    expect(response.ttfbMs).toBeGreaterThanOrEqual(0);
    expect(response.responseMs).toBeGreaterThanOrEqual(100);
    expect(response.ttfbMs).toBeLessThan(response.responseMs);
  });
});
