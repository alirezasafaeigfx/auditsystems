import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { fetchAuditHtml, fetchAuditResource } from "./safeAuditFetch";

describe("fetchAuditHtml", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    vi.stubEnv("AUDIT_ALLOW_LOCAL_FIXTURE", "true");

    server = createServer((request, response) => {
      if (request.url === "/redirect") {
        response.writeHead(302, { Location: "/ok" });
        response.end();
        return;
      }

      if (request.url === "/loop") {
        response.writeHead(302, { Location: "/loop" });
        response.end();
        return;
      }

      if (request.url === "/large") {
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end("x".repeat(512));
        return;
      }

      if (request.url === "/gzip-large") {
        const body = gzipSync("x".repeat(4096));
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Encoding": "gzip",
          "Content-Length": String(body.byteLength)
        });
        response.end(body);
        return;
      }

      if (request.url === "/binary") {
        response.writeHead(200, { "Content-Type": "application/octet-stream" });
        response.end("not html");
        return;
      }

      if (request.url === "/near-miss-type") {
        response.writeHead(200, { "Content-Type": "text/plainx; charset=utf-8" });
        response.end("not actually text/plain");
        return;
      }

      if (request.url === "/robots.txt") {
        const accept = String(request.headers.accept ?? "");
        if (!accept.includes("text/plain")) {
          response.writeHead(406, { "Content-Type": "text/plain" });
          response.end("robots negotiation failed");
          return;
        }
        response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("User-agent: *\nDisallow:");
        return;
      }

      if (request.url === "/sitemap.xml") {
        const accept = String(request.headers.accept ?? "");
        if (!accept.includes("application/xml")) {
          response.writeHead(406, { "Content-Type": "text/plain" });
          response.end("sitemap negotiation failed");
          return;
        }
        response.writeHead(200, { "Content-Type": "application/xml" });
        response.end("<?xml version=\"1.0\"?><urlset></urlset>");
        return;
      }

      if (request.url === "/unsupported-encoding") {
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Encoding": "compress"
        });
        response.end("encoded body");
        return;
      }

      if (request.url === "/slow") {
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.write("<html><body>");
        const timer = setTimeout(() => response.end("done</body></html>"), 1000);
        response.once("close", () => clearTimeout(timer));
        return;
      }

      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end("<html><head><title>Fixture</title></head><body>ok</body></html>");
    });

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    vi.unstubAllEnvs();
  });

  it("fetches HTML through the DNS-pinned transport", async () => {
    const response = await fetchAuditHtml(`${baseUrl}/ok`, new AbortController().signal);

    expect(response.status).toBe(200);
    expect(response.finalUrl).toBe(`${baseUrl}/ok`);
    expect(response.html).toContain("<title>Fixture</title>");
  });

  it("revalidates and follows bounded redirects", async () => {
    const response = await fetchAuditHtml(`${baseUrl}/redirect`, new AbortController().signal);

    expect(response.status).toBe(200);
    expect(response.finalUrl).toBe(`${baseUrl}/ok`);
  });

  it("rejects redirect loops", async () => {
    await expect(
      fetchAuditHtml(`${baseUrl}/loop`, new AbortController().signal, { maxRedirects: 1 })
    ).rejects.toThrow("AUDIT_TOO_MANY_REDIRECTS");
  });

  it("rejects uncompressed bodies over the byte budget", async () => {
    await expect(
      fetchAuditHtml(`${baseUrl}/large`, new AbortController().signal, { maxResponseBytes: 64 })
    ).rejects.toThrow("AUDIT_RESPONSE_TOO_LARGE");
  });

  it("rejects decompressed bodies over the byte budget", async () => {
    await expect(
      fetchAuditHtml(`${baseUrl}/gzip-large`, new AbortController().signal, { maxResponseBytes: 128 })
    ).rejects.toThrow("AUDIT_RESPONSE_TOO_LARGE");
  });

  it("rejects non-HTML content", async () => {
    await expect(fetchAuditHtml(`${baseUrl}/binary`, new AbortController().signal)).rejects.toThrow(
      "AUDIT_UNSUPPORTED_CONTENT_TYPE"
    );
  });

  it("rejects media-type prefix near misses", async () => {
    await expect(
      fetchAuditResource(`${baseUrl}/near-miss-type`, new AbortController().signal, {
        acceptedContentTypes: ["text/plain"]
      })
    ).rejects.toThrow("AUDIT_UNSUPPORTED_CONTENT_TYPE");
  });

  it("negotiates and fetches bounded text and XML resources through the pinned transport", async () => {
    const robots = await fetchAuditResource(`${baseUrl}/robots.txt`, new AbortController().signal, {
      acceptedContentTypes: ["text/plain"],
      maxResponseBytes: 256 * 1024
    });
    const sitemap = await fetchAuditResource(`${baseUrl}/sitemap.xml`, new AbortController().signal, {
      acceptedContentTypes: ["application/xml", "text/xml"],
      maxResponseBytes: 256 * 1024
    });

    expect(robots.status).toBe(200);
    expect(robots.body).toContain("User-agent");
    expect(sitemap.status).toBe(200);
    expect(sitemap.body).toContain("<urlset>");
  });

  it("rejects unsupported response encodings", async () => {
    await expect(
      fetchAuditHtml(`${baseUrl}/unsupported-encoding`, new AbortController().signal)
    ).rejects.toThrow("AUDIT_UNSUPPORTED_CONTENT_ENCODING");
  });

  it("aborts an in-progress response body after headers arrive", async () => {
    const controller = new AbortController();
    const pending = fetchAuditHtml(`${baseUrl}/slow`, controller.signal);
    setTimeout(() => controller.abort(new Error("TEST_STREAM_ABORT")), 25);

    await expect(pending).rejects.toThrow("TEST_STREAM_ABORT");
  });
});
