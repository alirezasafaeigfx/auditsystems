import { Job, JobType, Prisma } from "@prisma/client";
import { prisma } from "../lib/db";
import { extractResourcesFromHtml } from "../lib/extractResources";
import { normalizeAuditTargetUrl } from "../lib/normalizeAuditTargetUrl";
import {
  buildPerformanceDiagnostics,
  collectPerformanceEvidenceBundle,
} from "../lib/performance-evidence";
import { applyPerformanceEvidencePolicy } from "../lib/performance-rules";
import { evaluateAuditRules } from "../lib/rules";
import { parseSeoBasics } from "../lib/seo";
import { buildAuditSummaryV1 } from "../lib/summary";
import { calculateScore } from "../lib/scoring";
import { createAuditLogger } from "../lib/logger";
import { createRequestId } from "../lib/observability";
import { sendAuditCompleteNotification } from "../lib/notifications";
import { recordFunnelEvent } from "../lib/funnel-events";
import { fetchAuditHtml } from "../lib/safeAuditFetch";
import { collectSeoFileEvidence } from "../lib/seo-file-evidence";
import type { AuditContext } from "../lib/types";

export type JobHandler = (job: Job, signal: AbortSignal) => Promise<void>;

export const auditRunHandler: JobHandler = async (job, signal) => {
  const payload = job.payload as { runId?: string };
  if (!payload.runId) {
    throw new Error("INVALID_JOB_PAYLOAD");
  }

  const run = await prisma.auditRun.findUnique({ where: { id: payload.runId } });
  if (!run) {
    throw new Error("RUN_NOT_FOUND");
  }

  const normalized = await normalizeAuditTargetUrl(run.url, { verifyDnsPublicIp: false });

  await prisma.auditRun.update({
    where: { id: run.id },
    data: {
      normalizedUrl: normalized.normalizedUrl,
      status: "RUNNING",
      reportStatus: "RUNNING",
      startedAt: new Date(),
      errorCode: null,
      errorMessage: null
    }
  });

  const started = Date.now();

  try {
    const main = await fetchAuditHtml(normalized.normalizedUrl, signal);
    const finalTarget = await normalizeAuditTargetUrl(main.finalUrl, { verifyDnsPublicIp: false });
    const firstPartyHosts = new Set([
      normalized.host,
      `www.${normalized.host}`,
      finalTarget.host,
      `www.${finalTarget.host}`
    ]);
    const resources = extractResourcesFromHtml(main.html, { baseUrl: main.finalUrl, firstPartyHosts });
    const seo = parseSeoBasics(main.html);
    const seoFiles = await collectSeoFileEvidence(finalTarget.origin, signal);
    const context: AuditContext = {
      target: {
        normalizedUrl: normalized.normalizedUrl,
        origin: normalized.origin,
        host: normalized.host,
        protocol: normalized.protocol,
        firstPartyHosts
      },
      main: {
        finalUrl: main.finalUrl,
        status: main.status,
        headers: main.headers,
        html: main.html,
        metrics: {
          responseMs: main.responseMs,
          ttfbMs: main.ttfbMs
        }
      },
      resources,
      seo,
      seoFiles
    };

    const findings = applyPerformanceEvidencePolicy(context, evaluateAuditRules(context));
    const blockingScriptCount = resources.filter((resource) =>
      resource.kind === "script"
      && resource.isThirdParty
      && resource.inHead === true
      && resource.attrs?.async !== true
      && resource.attrs?.defer !== true).length;
    const imagesWithoutDimensions = resources.filter((resource) =>
      (resource.kind === "img" || resource.kind === "image")
      && (!resource.attrs?.width || !resource.attrs?.height)).length;
    const diagnostics = buildPerformanceDiagnostics({
      requestedUrl: normalized.normalizedUrl,
      finalUrl: main.finalUrl,
      responseMs: main.responseMs,
      ttfbMs: main.ttfbMs,
      resourceCount: resources.length,
      blockingScriptCount,
      imagesWithoutDimensions,
    });
    const performance = await collectPerformanceEvidenceBundle({
      requestedUrl: normalized.normalizedUrl,
      finalUrl: main.finalUrl,
      depth: run.depth,
      diagnostics,
      apiKey: process.env.PAGESPEED_API_KEY,
    });

    const summary = buildAuditSummaryV1({
      runId: run.id,
      inputUrl: run.url,
      normalizedUrl: normalized.normalizedUrl,
      finalUrl: main.finalUrl,
      depth: run.depth,
      durationMs: Date.now() - started,
      headers: main.headers,
      resources,
      findings,
      seo,
      seoFiles,
      performance,
    });

    const score = calculateScore(findings);

    await prisma.$transaction([
      prisma.auditResource.deleteMany({ where: { runId: run.id } }),
      prisma.auditFinding.deleteMany({ where: { runId: run.id } }),
      prisma.auditResource.createMany({
        data: resources.map((resource) => ({
          runId: run.id,
          kind: resource.kind,
          url: resource.url,
          host: resource.host,
          isThirdParty: resource.isThirdParty,
          inHead: resource.inHead,
          attrs: resource.attrs
        }))
      }),
      prisma.auditFinding.createMany({
        data: findings.map((finding) => ({
          runId: run.id,
          category: finding.category,
          severity: finding.severity,
          code: finding.code,
          title: finding.title,
          description: finding.description,
          recommendation: finding.recommendation,
          evidence: (finding.evidence ?? Prisma.JsonNull) as Prisma.InputJsonValue
        }))
      }),
      prisma.auditRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCEEDED",
          reportStatus: "REVIEW",
          finishedAt: new Date(),
          summary: {
            ...(summary as unknown as Record<string, unknown>),
            score: score.overall,
            grade: score.grade,
            categoryScores: score.categories,
            severityCounts: score.severityCounts
          } as Prisma.InputJsonValue
        }
      })
    ]);

    try {
      await recordFunnelEvent({ eventType: "report_review", runId: run.id });
    } catch (funnelError) {
      const logger = createAuditLogger(createRequestId(), run.id);
      logger.warn("worker_audit_funnel_event_failed", {
        runId: run.id,
        error: funnelError instanceof Error ? funnelError.message : String(funnelError)
      });
    }

    if (run.organizationId) {
      const membership = await prisma.membership.findFirst({
        where: { organizationId: run.organizationId }
      });
      if (membership) {
        sendAuditCompleteNotification(membership.userId, {
          auditId: run.id,
          url: run.url,
          score: score.overall,
          grade: score.grade,
          totalFindings: score.totalFindings,
          severityCounts: score.severityCounts as Record<string, number>,
          categoryScores: score.categories as Record<string, number>
        }).catch((err) => {
          console.error(`[Worker] notification failed for audit ${run.id}:`, err);
        });
      }
    }
  } catch (error) {
    await prisma.auditRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        reportStatus: "FAILED",
        finishedAt: new Date(),
        errorCode: "AUDIT_FAILED",
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    });
    throw error;
  }
};

export const handlers: Record<JobType, JobHandler> = {
  AUDIT_RUN: auditRunHandler
};
