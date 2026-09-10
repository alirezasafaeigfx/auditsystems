import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "../lib/db";
import { generateCSRFToken } from "../lib/csrf";
import { hashPassword } from "../lib/reportShare";
import { getReportAccessCookieName, createReportAccessCredential } from "../lib/report-access";
import { runWorkerCycle } from "./worker-cycle";
import { assertDisposableAu11Database } from "./au11-test-guard";

const integrationRequested = process.env.AU11_AUDIT_FLOW_INTEGRATION === "true";
if (integrationRequested) assertDisposableAu11Database(process.env);
const integrationEnabled = integrationRequested;
const describePostgres = integrationEnabled ? describe : describe.skip;

describePostgres("AU-11 audit flow — disposable PostgreSQL", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    vi.stubEnv("AUDIT_ALLOW_LOCAL_FIXTURE", "true");
    vi.stubEnv("AUDIT_DNS_GUARD", "false");
    vi.stubEnv("CSRF_SECRET", "au11-synthetic-csrf-secret-minimum-32");
    vi.stubEnv("REPORT_ACCESS_SECRET", "au11-synthetic-report-access-secret-minimum-32");
    vi.stubEnv("DOWNLOAD_TOKEN_SECRET", "au11-synthetic-download-secret-minimum-32");
    server = createServer((request, response) => {
      if (request.url === "/robots.txt") {
        response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("User-agent: *\\nDisallow:");
        return;
      }
      if (request.url === "/sitemap.xml") {
        response.writeHead(200, { "Content-Type": "application/xml" });
        response.end("<?xml version=\"1.0\"?><urlset></urlset>");
        return;
      }
      if (request.url === "/fail") {
        response.writeHead(200, { "Content-Type": "application/octet-stream" });
        response.end("not HTML");
        return;
      }
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end("<html><head><title>AU11 Fixture</title><meta name=\"description\" content=\"fixture\"></head><body><main>synthetic audit target</main></body></html>");
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve());
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(async () => {
    await prisma.job.deleteMany();
    await prisma.auditRun.deleteMany();
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await prisma.$disconnect();
    vi.unstubAllEnvs();
  });

  async function submit(url: string, idempotencyKey: string) {
    const { POST } = await import("../app/api/audit/runs/route");
    const csrf = generateCSRFToken();
    const response = await POST(new NextRequest("https://audit.test/api/audit/runs", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrf,
        "idempotency-key": idempotencyKey,
        "x-forwarded-for": "198.51.100.77",
        "x-asdev-locale": "en",
      },
      body: JSON.stringify({ url, depth: "QUICK" }),
    }));
    return { response, body: await response.json() as { runId: string; token: string; reused: boolean } };
  }

  it("persists a partial result from real submission and serves it only through authorized report and PDF credentials", async () => {
    const submitted = await submit(`${baseUrl}/success`, "au11-success");
    expect(submitted.response.status).toBe(200);
    expect(submitted.body.reused).toBe(false);

    expect(await runWorkerCycle({ workerId: "au11-success-worker", fallbackTimeoutMs: 5_000 })).toBe(1);
    const persisted = await prisma.auditRun.findUniqueOrThrow({ where: { id: submitted.body.runId }, include: { findings: true } });
    expect(persisted.status).toBe("SUCCEEDED");
    expect(persisted.reportStatus).toBe("REVIEW");

    await prisma.reportShare.update({ where: { token: submitted.body.token }, data: { passwordHash: hashPassword("synthetic-au11-password") } });
    const { GET: getReport } = await import("../app/api/reports/[token]/route");
    const unauthorized = await getReport(new Request(`https://audit.test/api/reports/${submitted.body.token}`), { params: Promise.resolve({ token: submitted.body.token }) });
    expect(unauthorized.status).toBe(401);
    expect(await unauthorized.text()).not.toContain("synthetic audit target");

    const credential = createReportAccessCredential(submitted.body.token);
    const authorized = await getReport(new Request(`https://audit.test/api/reports/${submitted.body.token}`, {
      headers: { cookie: `${getReportAccessCookieName(submitted.body.token)}=${credential}` },
    }), { params: Promise.resolve({ token: submitted.body.token }) });
    expect(authorized.status).toBe(200);
    expect(authorized.headers.get("cache-control")).toContain("no-store");
    const report = await authorized.json() as { result: { availability: string; coverage: { ratio: number | null } } };
    expect(report.result.availability).toBe("PARTIAL");
    expect(report.result.coverage.ratio).not.toBe(1);

    const order = await prisma.auditOrder.create({ data: { runId: persisted.id, email: "synthetic@example.invalid", amountToman: 1, status: "PAID" } });
    const { createDownloadToken } = await import("../lib/downloadToken");
    const { GET: getPdf } = await import("../app/api/pdf/[token]/route");
    const pdf = await getPdf(new NextRequest(`https://audit.test/api/pdf/${submitted.body.token}?dl=${createDownloadToken({ runId: persisted.id, orderId: order.id, email: order.email })}`), { params: Promise.resolve({ token: submitted.body.token }) });
    expect(pdf.status).toBe(200);
    expect(pdf.headers.get("content-type")).toContain("application/pdf");
    expect((await pdf.arrayBuffer()).byteLength).toBeGreaterThan(4);
  });

  it("deduplicates the same public submission before a worker runs", async () => {
    const first = await submit(`${baseUrl}/duplicate`, "au11-duplicate");
    const second = await submit(`${baseUrl}/duplicate`, "au11-duplicate");
    expect(first.body.runId).toBe(second.body.runId);
    expect([first.body.reused, second.body.reused].sort()).toEqual([false, true]);
    expect(await prisma.auditRun.count()).toBe(1);
    expect(await prisma.job.count()).toBe(1);
  });

  it("does not lease a queued job after the worker shutdown signal", async () => {
    const submitted = await submit(`${baseUrl}/shutdown`, "au11-shutdown");
    const shutdown = new AbortController();
    shutdown.abort(new Error("WORKER_SHUTDOWN"));

    expect(await runWorkerCycle({
      workerId: "au11-shutdown-worker",
      fallbackTimeoutMs: 5_000,
      signal: shutdown.signal,
    })).toBe(0);

    const job = await prisma.job.findFirstOrThrow({ where: { payload: { path: ["runId"], equals: submitted.body.runId } } });
    expect(job.status).toBe("QUEUED");
    expect(job.attempt).toBe(0);
  });

  it("retries an actual worker failure and marks its final allowed attempt terminal", async () => {
    const submitted = await submit(`${baseUrl}/fail`, "au11-terminal");
    const job = await prisma.job.findFirstOrThrow({ where: { payload: { path: ["runId"], equals: submitted.body.runId } } });
    await prisma.job.update({ where: { id: job.id }, data: { maxAttempts: 2 } });

    expect(await runWorkerCycle({ workerId: "au11-failure-worker", fallbackTimeoutMs: 5_000 })).toBe(1);
    const retry = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(retry.status).toBe("QUEUED");
    expect(retry.attempt).toBe(1);

    await prisma.job.update({ where: { id: job.id }, data: { availableAt: new Date(Date.now() - 1_000) } });
    expect(await runWorkerCycle({ workerId: "au11-failure-worker", fallbackTimeoutMs: 5_000 })).toBe(1);
    const terminal = await prisma.job.findUniqueOrThrow({ where: { id: job.id } });
    const failedRun = await prisma.auditRun.findUniqueOrThrow({ where: { id: submitted.body.runId } });
    expect(terminal.status).toBe("FAILED");
    expect(terminal.attempt).toBe(2);
    expect(failedRun.status).toBe("FAILED");
    expect(failedRun.reportStatus).toBe("FAILED");
  });
});
