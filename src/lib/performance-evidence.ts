import crypto from "node:crypto";

export type PerformanceCollectionStatus =
  | "SUCCESS"
  | "PARTIAL"
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "TIMEOUT"
  | "INVALID_RESPONSE"
  | "UNAVAILABLE";

export type PerformanceEvidenceClass = "MEASURED" | "OBSERVED" | "UNAVAILABLE";
export type PageSpeedStrategy = "mobile" | "desktop";
export type PerformanceMetricKey = "lcp" | "inp" | "cls" | "fcp" | "tbt";

export type PerformanceEvidenceMetric = {
  key: PerformanceMetricKey;
  label: string;
  value: number | null;
  unit: "ms" | "score";
  evidenceClass: PerformanceEvidenceClass;
  provider: "GOOGLE_CRUX" | "GOOGLE_LIGHTHOUSE";
  strategy: "field-url" | PageSpeedStrategy;
  status: PerformanceCollectionStatus;
  coverage: number;
  limitations: string[];
};

export type PageSpeedStrategyResult = {
  provider: "GOOGLE_PAGESPEED_INSIGHTS";
  strategy: PageSpeedStrategy;
  requestedUrl: string;
  finalUrl: string | null;
  collectedAt: string;
  expiresAt: string;
  fieldExpiresAt?: string;
  labExpiresAt?: string;
  status: PerformanceCollectionStatus;
  cacheKey: string;
  rawReference: string;
  fieldMetrics: PerformanceEvidenceMetric[];
  labMetrics: PerformanceEvidenceMetric[];
  coverage: { field: number; lab: number };
  confidence: number;
  limitations: string[];
};

export type PerformanceDiagnosticMetric = {
  key: "response_ms" | "ttfb_ms" | "resource_count" | "blocking_script_count" | "images_without_dimensions";
  label: string;
  value: number | null;
  unit: "ms" | "count";
};

export type PerformanceDiagnostics = {
  evidenceClass: "OBSERVED";
  status: "SUCCESS" | "PARTIAL";
  collectedAt: string;
  requestedUrl: string;
  finalUrl: string;
  metrics: PerformanceDiagnosticMetric[];
  limitations: string[];
};

export type PerformanceEvidenceBundle = {
  policyVersion: "performance-evidence.v1";
  requestedUrl: string;
  finalUrl: string;
  collectedAt: string;
  providerResults: PageSpeedStrategyResult[];
  diagnostics: PerformanceDiagnostics;
  coverage: { field: number; lab: number; diagnostics: number; overall: number };
  confidence: number;
  score: null;
  withheldReason: string;
  limitations: string[];
};

type FetchLike = typeof fetch;

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_RESPONSE_BYTES = 1_000_000;
const FIELD_TTL_MS = 24 * 60 * 60 * 1000;
const LAB_TTL_MS = 6 * 60 * 60 * 1000;
const POLICY_VERSION = "performance-evidence.v1";

const FIELD_DEFINITIONS = [
  { key: "lcp" as const, label: "Largest Contentful Paint", unit: "ms" as const, providerKey: "LARGEST_CONTENTFUL_PAINT_MS" },
  { key: "inp" as const, label: "Interaction to Next Paint", unit: "ms" as const, providerKey: "INTERACTION_TO_NEXT_PAINT" },
  { key: "cls" as const, label: "Cumulative Layout Shift", unit: "score" as const, providerKey: "CUMULATIVE_LAYOUT_SHIFT_SCORE" },
];

const LAB_DEFINITIONS = [
  { key: "lcp" as const, label: "Largest Contentful Paint", unit: "ms" as const, providerKey: "largest-contentful-paint" },
  { key: "cls" as const, label: "Cumulative Layout Shift", unit: "score" as const, providerKey: "cumulative-layout-shift" },
  { key: "fcp" as const, label: "First Contentful Paint", unit: "ms" as const, providerKey: "first-contentful-paint" },
  { key: "tbt" as const, label: "Total Blocking Time", unit: "ms" as const, providerKey: "total-blocking-time" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function ratio(available: number, total: number): number {
  return total === 0 ? 0 : available / total;
}

function addMs(date: Date, milliseconds: number): string {
  return new Date(date.getTime() + milliseconds).toISOString();
}

function safeRequestedUrl(value: string): string {
  if (value.length > 2048) throw new Error("PERFORMANCE_URL_TOO_LONG");
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("PERFORMANCE_URL_PROTOCOL");
  if (url.username || url.password) throw new Error("PERFORMANCE_URL_CREDENTIALS");
  return url.toString();
}

function safeFinalUrl(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  try {
    return safeRequestedUrl(value);
  } catch {
    return fallback;
  }
}

function identity(requestedUrl: string, strategy: PageSpeedStrategy): { cacheKey: string; rawReference: string } {
  const digest = crypto.createHash("sha256").update(`${POLICY_VERSION}\u0000${strategy}\u0000${requestedUrl}`).digest("hex");
  return {
    cacheKey: `${POLICY_VERSION}:${strategy}:${digest}`,
    rawReference: `pagespeed:${strategy}:${digest}`,
  };
}

function unavailableFieldMetrics(status: PerformanceCollectionStatus, limitation: string): PerformanceEvidenceMetric[] {
  return FIELD_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    value: null,
    unit: definition.unit,
    evidenceClass: "UNAVAILABLE",
    provider: "GOOGLE_CRUX",
    strategy: "field-url",
    status,
    coverage: 0,
    limitations: [limitation],
  }));
}

function unavailableLabMetrics(
  strategy: PageSpeedStrategy,
  status: PerformanceCollectionStatus,
  limitation: string,
): PerformanceEvidenceMetric[] {
  return LAB_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    value: null,
    unit: definition.unit,
    evidenceClass: "UNAVAILABLE",
    provider: "GOOGLE_LIGHTHOUSE",
    strategy,
    status,
    coverage: 0,
    limitations: [definition.key === "tbt" ? `${limitation} TBT is not INP.` : limitation],
  }));
}

function unavailableResult(input: {
  requestedUrl: string;
  strategy: PageSpeedStrategy;
  now: Date;
  status: PerformanceCollectionStatus;
  limitation: string;
}): PageSpeedStrategyResult {
  const ids = identity(input.requestedUrl, input.strategy);
  return {
    provider: "GOOGLE_PAGESPEED_INSIGHTS",
    strategy: input.strategy,
    requestedUrl: input.requestedUrl,
    finalUrl: null,
    collectedAt: input.now.toISOString(),
    expiresAt: addMs(input.now, LAB_TTL_MS),
    fieldExpiresAt: addMs(input.now, FIELD_TTL_MS),
    labExpiresAt: addMs(input.now, LAB_TTL_MS),
    status: input.status,
    ...ids,
    fieldMetrics: unavailableFieldMetrics(input.status, input.limitation),
    labMetrics: unavailableLabMetrics(input.strategy, input.status, input.limitation),
    coverage: { field: 0, lab: 0 },
    confidence: 0,
    limitations: [input.limitation],
  };
}

async function boundedJson(response: Response, maxResponseBytes: number): Promise<unknown> {
  const advertised = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(advertised) && advertised > maxResponseBytes) throw new Error("PERFORMANCE_RESPONSE_TOO_LARGE");
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > maxResponseBytes) throw new Error("PERFORMANCE_RESPONSE_TOO_LARGE");
  return JSON.parse(text) as unknown;
}

function parseFieldMetrics(payload: Record<string, unknown>): PerformanceEvidenceMetric[] {
  const urlExperience = isRecord(payload.loadingExperience) ? payload.loadingExperience : null;
  const originExperience = isRecord(payload.originLoadingExperience) ? payload.originLoadingExperience : null;
  const experience = urlExperience && isRecord(urlExperience.metrics)
    ? urlExperience
    : originExperience && isRecord(originExperience.metrics)
      ? originExperience
      : null;
  const metrics = experience && isRecord(experience.metrics) ? experience.metrics : {};
  const scopeLimitation = experience === originExperience
    ? "CrUX URL-level data unavailable; origin-level field data was used."
    : null;

  return FIELD_DEFINITIONS.map((definition) => {
    const providerMetric = isRecord(metrics[definition.providerKey]) ? metrics[definition.providerKey] : null;
    let value = providerMetric ? finiteNumber(providerMetric.percentile) : null;
    if (definition.key === "cls" && value !== null && value > 1) value /= 100;
    if (value === null) {
      return {
        key: definition.key,
        label: definition.label,
        value: null,
        unit: definition.unit,
        evidenceClass: "UNAVAILABLE",
        provider: "GOOGLE_CRUX",
        strategy: "field-url",
        status: "UNAVAILABLE",
        coverage: 0,
        limitations: [`CrUX did not return ${definition.label} for this URL.`],
      };
    }
    return {
      key: definition.key,
      label: definition.label,
      value,
      unit: definition.unit,
      evidenceClass: "MEASURED",
      provider: "GOOGLE_CRUX",
      strategy: "field-url",
      status: "SUCCESS",
      coverage: 1,
      limitations: scopeLimitation ? [scopeLimitation] : [],
    };
  });
}

function parseLabMetrics(payload: Record<string, unknown>, strategy: PageSpeedStrategy): PerformanceEvidenceMetric[] {
  const lighthouse = isRecord(payload.lighthouseResult) ? payload.lighthouseResult : null;
  const audits = lighthouse && isRecord(lighthouse.audits) ? lighthouse.audits : {};

  return LAB_DEFINITIONS.map((definition) => {
    const audit = isRecord(audits[definition.providerKey]) ? audits[definition.providerKey] : null;
    const value = audit ? finiteNumber(audit.numericValue) : null;
    const baseLimitation = "Lighthouse lab result; not real-user field data.";
    if (value === null) {
      return {
        key: definition.key,
        label: definition.label,
        value: null,
        unit: definition.unit,
        evidenceClass: "UNAVAILABLE",
        provider: "GOOGLE_LIGHTHOUSE",
        strategy,
        status: "UNAVAILABLE",
        coverage: 0,
        limitations: [definition.key === "tbt" ? "Lighthouse did not return TBT. TBT is not INP." : `Lighthouse did not return ${definition.label}.`],
      };
    }
    return {
      key: definition.key,
      label: definition.label,
      value,
      unit: definition.unit,
      evidenceClass: "OBSERVED",
      provider: "GOOGLE_LIGHTHOUSE",
      strategy,
      status: "SUCCESS",
      coverage: 1,
      limitations: [definition.key === "tbt" ? `${baseLimitation} TBT is not INP.` : baseLimitation],
    };
  });
}

function statusForResponse(response: Response): PerformanceCollectionStatus | null {
  if (response.status === 401 || response.status === 403) return "UNAUTHORIZED";
  if (response.status === 429) return "RATE_LIMITED";
  if (!response.ok) return "UNAVAILABLE";
  return null;
}

export async function collectPageSpeedStrategy(input: {
  requestedUrl: string;
  strategy: PageSpeedStrategy;
  apiKey?: string | null;
  fetchImpl?: FetchLike;
  now?: Date;
  timeoutMs?: number;
  maxResponseBytes?: number;
}): Promise<PageSpeedStrategyResult> {
  const now = input.now ?? new Date();
  let requestedUrl: string;
  try {
    requestedUrl = safeRequestedUrl(input.requestedUrl);
  } catch {
    return unavailableResult({
      requestedUrl: input.requestedUrl.slice(0, 2048) || "https://invalid.local/",
      strategy: input.strategy,
      now,
      status: "INVALID_RESPONSE",
      limitation: "Requested URL is not a bounded HTTP(S) URL.",
    });
  }

  const apiKey = String(input.apiKey ?? "").trim();
  if (!apiKey) {
    return unavailableResult({
      requestedUrl,
      strategy: input.strategy,
      now,
      status: "UNAVAILABLE",
      limitation: "PageSpeed provider is not configured. Set PAGESPEED_API_KEY to collect field and lab evidence.",
    });
  }

  const timeoutMs = Math.max(100, Math.min(30_000, Math.floor(input.timeoutMs ?? DEFAULT_TIMEOUT_MS)));
  const maxResponseBytes = Math.max(1024, Math.min(5_000_000, Math.floor(input.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES)));
  const fetchImpl = input.fetchImpl ?? fetch;
  const providerUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  providerUrl.searchParams.set("url", requestedUrl);
  providerUrl.searchParams.set("strategy", input.strategy);
  providerUrl.searchParams.set("category", "performance");
  providerUrl.searchParams.set("key", apiKey);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(providerUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    const timeout = error instanceof Error && error.name === "AbortError";
    return unavailableResult({
      requestedUrl,
      strategy: input.strategy,
      now,
      status: timeout ? "TIMEOUT" : "UNAVAILABLE",
      limitation: timeout ? "PageSpeed provider timed out." : "PageSpeed provider request failed.",
    });
  } finally {
    clearTimeout(timer);
  }

  const httpStatus = statusForResponse(response);
  if (httpStatus) {
    return unavailableResult({
      requestedUrl,
      strategy: input.strategy,
      now,
      status: httpStatus,
      limitation: httpStatus === "RATE_LIMITED"
        ? "PageSpeed provider rate limit was reached."
        : httpStatus === "UNAUTHORIZED"
          ? "PageSpeed provider rejected the configured credential."
          : `PageSpeed provider returned HTTP ${response.status}.`,
    });
  }

  let parsed: unknown;
  try {
    parsed = await boundedJson(response, maxResponseBytes);
  } catch {
    return unavailableResult({
      requestedUrl,
      strategy: input.strategy,
      now,
      status: "INVALID_RESPONSE",
      limitation: "PageSpeed provider response was invalid or exceeded the byte budget.",
    });
  }
  if (!isRecord(parsed)) {
    return unavailableResult({
      requestedUrl,
      strategy: input.strategy,
      now,
      status: "INVALID_RESPONSE",
      limitation: "PageSpeed provider response was not an object.",
    });
  }

  const fieldMetrics = parseFieldMetrics(parsed);
  const labMetrics = parseLabMetrics(parsed, input.strategy);
  const fieldCoverage = ratio(fieldMetrics.filter((metric) => metric.value !== null).length, fieldMetrics.length);
  const labCoverage = ratio(labMetrics.filter((metric) => metric.value !== null).length, labMetrics.length);
  const available = fieldCoverage + labCoverage;
  const hasProviderShape = isRecord(parsed.loadingExperience)
    || isRecord(parsed.originLoadingExperience)
    || isRecord(parsed.lighthouseResult);
  const status: PerformanceCollectionStatus = !hasProviderShape
    ? "INVALID_RESPONSE"
    : available === 2
      ? "SUCCESS"
      : available > 0
        ? "PARTIAL"
        : "UNAVAILABLE";
  const lighthouse = isRecord(parsed.lighthouseResult) ? parsed.lighthouseResult : null;
  const finalUrl = safeFinalUrl(lighthouse?.finalUrl, requestedUrl);
  const ids = identity(requestedUrl, input.strategy);
  const limitations = [...fieldMetrics, ...labMetrics].flatMap((metric) => metric.limitations);

  return {
    provider: "GOOGLE_PAGESPEED_INSIGHTS",
    strategy: input.strategy,
    requestedUrl,
    finalUrl,
    collectedAt: now.toISOString(),
    expiresAt: addMs(now, LAB_TTL_MS),
    fieldExpiresAt: addMs(now, FIELD_TTL_MS),
    labExpiresAt: addMs(now, LAB_TTL_MS),
    status,
    ...ids,
    fieldMetrics,
    labMetrics,
    coverage: { field: fieldCoverage, lab: labCoverage },
    confidence: clamp01(fieldCoverage * 0.7 + labCoverage * 0.3),
    limitations: [...new Set(limitations)],
  };
}

export function isPerformanceEvidenceStale(result: PageSpeedStrategyResult, now = new Date()): boolean {
  const expiresAt = Date.parse(result.expiresAt);
  return !Number.isFinite(expiresAt) || now.getTime() > expiresAt;
}

export function buildPerformanceDiagnostics(input: {
  requestedUrl: string;
  finalUrl: string;
  collectedAt?: Date;
  responseMs: number | null;
  ttfbMs: number | null;
  resourceCount: number | null;
  blockingScriptCount: number | null;
  imagesWithoutDimensions: number | null;
}): PerformanceDiagnostics {
  const metrics: PerformanceDiagnosticMetric[] = [
    { key: "response_ms", label: "Total HTML response time", value: input.responseMs, unit: "ms" },
    { key: "ttfb_ms", label: "Time to first byte", value: input.ttfbMs, unit: "ms" },
    { key: "resource_count", label: "Discovered resource count", value: input.resourceCount, unit: "count" },
    { key: "blocking_script_count", label: "Blocking third-party script count", value: input.blockingScriptCount, unit: "count" },
    { key: "images_without_dimensions", label: "Images without explicit dimensions", value: input.imagesWithoutDimensions, unit: "count" },
  ];
  const available = metrics.filter((metric) => metric.value !== null).length;
  return {
    evidenceClass: "OBSERVED",
    status: available === metrics.length ? "SUCCESS" : "PARTIAL",
    collectedAt: (input.collectedAt ?? new Date()).toISOString(),
    requestedUrl: input.requestedUrl,
    finalUrl: input.finalUrl,
    metrics,
    limitations: ["Diagnostics are bounded observations and are not Core Web Vitals measurements."],
  };
}

export async function collectPerformanceEvidenceBundle(input: {
  requestedUrl: string;
  finalUrl: string;
  depth: "QUICK" | "DEEP";
  diagnostics: PerformanceDiagnostics;
  apiKey?: string | null;
  fetchImpl?: FetchLike;
  now?: Date;
}): Promise<PerformanceEvidenceBundle> {
  const now = input.now ?? new Date();
  const strategies: PageSpeedStrategy[] = input.depth === "DEEP" ? ["mobile", "desktop"] : ["mobile"];
  const providerResults = await Promise.all(strategies.map((strategy) => collectPageSpeedStrategy({
    requestedUrl: input.requestedUrl,
    strategy,
    apiKey: input.apiKey,
    fetchImpl: input.fetchImpl,
    now,
  })));
  const field = Math.max(...providerResults.map((result) => result.coverage.field), 0);
  const lab = providerResults.length === 0
    ? 0
    : providerResults.reduce((total, result) => total + result.coverage.lab, 0) / providerResults.length;
  const diagnosticAvailable = input.diagnostics.metrics.filter((metric) => metric.value !== null).length;
  const diagnostics = ratio(diagnosticAvailable, input.diagnostics.metrics.length);
  const overall = (field + lab + diagnostics) / 3;
  const confidence = clamp01(field * 0.55 + lab * 0.3 + diagnostics * 0.15);
  const limitations = [...new Set([
    ...providerResults.flatMap((result) => result.limitations),
    ...input.diagnostics.limitations,
  ])];

  return {
    policyVersion: POLICY_VERSION,
    requestedUrl: input.requestedUrl,
    finalUrl: input.finalUrl,
    collectedAt: now.toISOString(),
    providerResults,
    diagnostics: input.diagnostics,
    coverage: { field, lab, diagnostics, overall },
    confidence,
    score: null,
    withheldReason: "No approved versioned performance scoring policy; evidence coverage and confidence are reported instead.",
    limitations,
  };
}

export function isPerformanceEvidenceBundle(value: unknown): value is PerformanceEvidenceBundle {
  if (!isRecord(value)) return false;
  if (value.policyVersion !== POLICY_VERSION) return false;
  if (!Array.isArray(value.providerResults) || !isRecord(value.diagnostics) || !isRecord(value.coverage)) return false;
  return typeof value.requestedUrl === "string"
    && typeof value.finalUrl === "string"
    && typeof value.collectedAt === "string"
    && value.score === null
    && typeof value.withheldReason === "string"
    && Array.isArray(value.limitations);
}
