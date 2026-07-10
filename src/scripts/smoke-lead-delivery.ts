import http from "node:http";
import net from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { prisma } from "../lib/db";

const ADMIN_USERNAME = "smoke-admin";
const ADMIN_PASSWORD = "smoke-password";
const ADMIN_SESSION_SECRET = "smoke-admin-session-secret";
const CSRF_SECRET = "smoke-csrf-secret";
const IP_HASH_SALT = "smoke-ip-hash-salt";

type CookieJar = Map<string, string>;

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run lead delivery smoke in production");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for real lead delivery smoke");
  }

  const appPort = await freePort();
  const fixture = await startFixtureServer();
  const app = startProcess(["exec", "next", "dev", "-p", String(appPort)], {
    PORT: String(appPort),
    ADMIN_USERNAME,
    ADMIN_PASSWORD,
    ADMIN_SESSION_SECRET,
    CSRF_SECRET,
    IP_HASH_SALT,
    AUDIT_ALLOW_LOCAL_FIXTURE: "true",
    AUDIT_DNS_GUARD: "false",
  });
  const worker = startProcess(["exec", "tsx", "src/worker/index.ts"], {
    ADMIN_SESSION_SECRET,
    CSRF_SECRET,
    IP_HASH_SALT,
    AUDIT_ALLOW_LOCAL_FIXTURE: "true",
    AUDIT_DNS_GUARD: "false",
    WORKER_POLL_MS: "200",
    WORKER_JOB_TIMEOUT_MS: "30000",
  });

  let leadId: string | null = null;
  let runId: string | null = null;

  try {
    await waitForApp(`http://127.0.0.1:${appPort}`);
    const jar: CookieJar = new Map();
    await login(`http://127.0.0.1:${appPort}`, jar);
    const csrf = await getCsrf(`http://127.0.0.1:${appPort}`, jar);

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const email = `smoke+${stamp}@example.test`.toLowerCase();
    const leadResponse = await jsonFetch(`http://127.0.0.1:${appPort}/api/leads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        domain: fixture.url,
        contact: email,
        businessType: "ecommerce",
        primaryConcern: "Smoke test lead for lead-to-delivery funnel verification.",
        consentPrivacy: true,
        leadSource: "smoke",
        sourcePlacement: "script",
        sourceOffer: "request_assessment",
        submitEventId: `smoke_${stamp}`,
      }),
    });
    if (leadResponse.status !== 202 || leadResponse.body.accepted !== true) {
      throw new Error(`lead_submit_failed:${leadResponse.status}:${JSON.stringify(leadResponse.body)}`);
    }

    const lead = await waitForLead(email);
    leadId = lead.id;

    await assertOk(await jsonFetch(`http://127.0.0.1:${appPort}/api/admin/leads/${leadId}`, {
      method: "PATCH",
      headers: adminHeaders(jar, csrf),
      body: JSON.stringify({ status: "QUALIFIED", internalNote: "Smoke qualification through admin API" }),
    }), "qualify");

    const start = await jsonFetch(`http://127.0.0.1:${appPort}/api/admin/leads/${leadId}/start-audit`, {
      method: "POST",
      headers: adminHeaders(jar, csrf, false),
    });
    await assertOk(start, "start_audit");
    runId = String(start.body.runId);

    await waitForReportStatus(runId, "REVIEW", 45000);

    await assertOk(await jsonFetch(`http://127.0.0.1:${appPort}/api/admin/leads/${leadId}`, {
      method: "PATCH",
      headers: adminHeaders(jar, csrf),
      body: JSON.stringify({ reportStatus: "DELIVERED" }),
    }), "deliver_report");

    const delivered = await prisma.auditLead.findUniqueOrThrow({
      where: { id: leadId },
      include: { run: true },
    });
    if (delivered.status !== "QUALIFIED" || delivered.run?.reportStatus !== "DELIVERED") {
      throw new Error(`unexpected_final_state:${delivered.status}:${delivered.run?.reportStatus}`);
    }

    const events = await prisma.funnelEvent.findMany({
      where: { OR: [{ leadId }, { runId }] },
      orderBy: { createdAt: "asc" },
    });
    const eventTypes = events.map((event) => event.eventType);
    for (const required of ["lead_submitted", "lead_qualified", "audit_started", "report_review", "report_delivered"]) {
      if (!eventTypes.includes(required)) {
        throw new Error(`missing_funnel_event:${required}`);
      }
    }

    process.stdout.write(JSON.stringify({
      verdict: "PASS",
      leadId,
      runId,
      events: eventTypes,
      finalReportStatus: delivered.run.reportStatus,
    }, null, 2));
    process.stdout.write("\n");
  } finally {
    await cleanup(leadId, runId);
    await fixture.close();
    stopProcess(worker);
    stopProcess(app);
    await prisma.$disconnect();
  }
}

function startProcess(args: string[], env: Record<string, string>): ChildProcess {
  const child = spawn("pnpm", args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => process.stdout.write(`[smoke-child] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[smoke-child] ${chunk}`));
  return child;
}

function stopProcess(child: ChildProcess): void {
  if (!child.killed) {
    child.kill("SIGTERM");
  }
}

async function startFixtureServer(): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((_request, response) => {
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-frame-options": "DENY",
    });
    response.end(`<!doctype html>
<html lang="en">
  <head>
    <title>Smoke Audit Fixture</title>
    <meta name="description" content="Deterministic local audit fixture for lead delivery smoke." />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <main>
      <h1>Smoke Audit Fixture</h1>
      <img src="/missing-alt.png" />
      <form><input name="email" /></form>
    </main>
  </body>
</html>`);
  });
  const port = await freePort();
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

async function waitForApp(baseUrl: string): Promise<void> {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/ready`, { cache: "no-store" });
      if (response.status < 500) return;
    } catch {
      await delay(500);
    }
  }
  throw new Error("app_did_not_start");
}

async function login(baseUrl: string, jar: CookieJar): Promise<void> {
  const response = await fetch(`${baseUrl}/api/admin/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
  });
  collectCookies(jar, response);
  if (!response.ok) {
    throw new Error(`admin_login_failed:${response.status}:${await response.text()}`);
  }
}

async function getCsrf(baseUrl: string, jar: CookieJar): Promise<Record<string, string>> {
  const response = await fetch(`${baseUrl}/api/csrf`, {
    headers: { cookie: cookieHeader(jar) },
    cache: "no-store",
  });
  collectCookies(jar, response);
  const body = await response.json() as { token?: string; headerName?: string };
  if (!body.token || !body.headerName) {
    throw new Error("csrf_token_missing");
  }
  return { [body.headerName]: body.token };
}

function adminHeaders(jar: CookieJar, csrf: Record<string, string>, json = true): Record<string, string> {
  return {
    ...(json ? { "content-type": "application/json" } : {}),
    ...csrf,
    cookie: cookieHeader(jar),
  };
}

async function jsonFetch(url: string, init: RequestInit): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(url, init);
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : {} };
}

async function assertOk(response: { status: number; body: Record<string, unknown> }, label: string): Promise<void> {
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`${label}_failed:${response.status}:${JSON.stringify(response.body)}`);
  }
}

async function waitForLead(email: string) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const lead = await prisma.auditLead.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
    if (lead) return lead;
    await delay(250);
  }
  throw new Error("lead_not_persisted");
}

async function waitForReportStatus(runId: string, status: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const run = await prisma.auditRun.findUnique({ where: { id: runId } });
    if (run?.reportStatus === status) return;
    if (run?.reportStatus === "FAILED") {
      throw new Error(`audit_failed:${run.errorCode}:${run.errorMessage}`);
    }
    await delay(500);
  }
  throw new Error(`report_status_timeout:${status}`);
}

async function cleanup(leadId: string | null, runId: string | null): Promise<void> {
  if (!leadId && !runId) return;
  const eventOr = [
    ...(leadId ? [{ leadId }] : []),
    ...(runId ? [{ runId }] : []),
  ];
  if (eventOr.length > 0) {
    await prisma.funnelEvent.deleteMany({ where: { OR: eventOr } });
  }
  if (runId) {
    await prisma.job.deleteMany({ where: { payload: { path: ["runId"], equals: runId } } });
    await prisma.auditOrder.deleteMany({ where: { runId } });
    await prisma.reportShare.deleteMany({ where: { runId } });
    await prisma.auditResource.deleteMany({ where: { runId } });
    await prisma.auditFinding.deleteMany({ where: { runId } });
  }
  if (leadId) {
    await prisma.auditLead.deleteMany({ where: { id: leadId } });
  }
  if (runId) {
    await prisma.auditRun.deleteMany({ where: { id: runId } });
  }
}

function collectCookies(jar: CookieJar, response: Response): void {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) return;
  for (const cookie of setCookie.split(/,(?=[^;,]+=)/)) {
    const [pair] = cookie.split(";");
    const [name, value] = pair.split("=");
    if (name && value) jar.set(name.trim(), value.trim());
  }
}

function cookieHeader(jar: CookieJar): string {
  return Array.from(jar.entries()).map(([name, value]) => `${name}=${value}`).join("; ");
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") resolve(address.port);
        else reject(new Error("free_port_failed"));
      });
    });
    server.on("error", reject);
  });
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
