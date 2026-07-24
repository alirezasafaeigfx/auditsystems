// 01-audit/src/worker/audit.handler.ts
// Audit job handler — payload: { runId }
//
// NOTE: این فایل را با PrismaClient و مدل‌های واقعی پروژه خودتان هماهنگ کنید.

import { PrismaClient } from "@prisma/client";
import type { JobHandler } from "../../03-shared/queue-worker/engine"; // مسیر را در پروژه خودتان اصلاح کنید

import { normalizeAuditTargetUrl } from "../lib/normalizeAuditTargetUrl";
import { extractResourcesFromHtml } from "../lib/extractResources";
import { evaluateAuditRules } from "../lib/rules";
import { buildAuditSummaryV1 } from "../lib/summary";

const prisma = new PrismaClient();

async function fetchHtml(url: string, signal: AbortSignal) {
  const res = await fetch(url, { signal, redirect: "follow" });
  const text = await res.text();
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => (headers[k] = v));
  return { finalUrl: res.url, status: res.status, headers, html: text };
}

export const auditRunHandler: JobHandler = async (job, signal) => {
  const { runId } = job.payload as { runId: string };

  const run = await prisma.auditRun.findUnique({ where: { id: runId } });
  if (!run) throw new Error("RUN_NOT_FOUND");

  const norm = await normalizeAuditTargetUrl(run.url, { verifyDnsPublicIp: true });

  await prisma.auditRun.update({
    where: { id: runId },
    data: {
      normalizedUrl: norm.normalizedUrl,
      status: "RUNNING",
      startedAt: new Date(),
      errorCode: null,
      errorMessage: null,
    },
  });

  const started = Date.now();

  try {
    const main = await fetchHtml(norm.normalizedUrl, signal);

    const firstPartyHosts = new Set([norm.host, `www.${norm.host}`].filter(Boolean));
    const resources = extractResourcesFromHtml(main.html, { baseUrl: main.finalUrl, firstPartyHosts });

    // This archived blueprint intentionally omits Lighthouse process orchestration.
    const lighthouse = undefined;

    const ctx = {
      target: {
        normalizedUrl: norm.normalizedUrl,
        origin: norm.origin,
        host: norm.host,
        protocol: norm.protocol,
        firstPartyHosts,
      },
      main: {
        finalUrl: main.finalUrl,
        status: main.status,
        headers: main.headers,
        html: main.html,
      },
      resources,
      lighthouse,
    };

    const findings = evaluateAuditRules(ctx as any);

    const summary = buildAuditSummaryV1({
      runId,
      inputUrl: run.url,
      normalizedUrl: norm.normalizedUrl,
      finalUrl: main.finalUrl,
      headers: main.headers,
      resources,
      findings,
      lighthouse,
      durationMs: Date.now() - started,
      depth: (run.depth as any) ?? "QUICK",
    });

    await prisma.auditRun.update({
      where: { id: runId },
      data: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
        summary,
        lighthouse,
      },
    });
  } catch (e: any) {
    await prisma.auditRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        errorCode: "AUDIT_FAILED",
        errorMessage: e?.message ?? String(e),
      },
    });
    throw e;
  }
};
