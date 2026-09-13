const apiCounters = new Map<string, number>();
const apiDurationBuckets = new Map<string, number>();
const rumCounters = new Map<string, number>();
const rumDurationBuckets = new Map<string, number>();

const LATENCY_BUCKETS_MS = [50, 100, 250, 500, 1000, 2500, 5000, 10000];
const RUM_BUCKETS_MS = [100, 250, 500, 1000, 2500, 4000, 6000, 10000];
const CLS_BUCKETS = [0.1, 0.25, 0.5, 1];
const RUM_WEB_VITALS = new Set(["TTFB", "FCP", "LCP", "CLS", "FID", "INP"]);
const RUM_ERROR_TYPES = new Set(["error", "unhandledrejection"]);

function incrementCounter(key: string, by: number = 1): void {
  apiCounters.set(key, (apiCounters.get(key) ?? 0) + by);
}

function observeLatency(route: string, durationMs: number): void {
  for (const bucket of LATENCY_BUCKETS_MS) {
    if (durationMs <= bucket) {
      incrementCounter(`audit_api_duration_bucket{route="${route}",le="${bucket}"}`);
    }
  }
  incrementCounter(`audit_api_duration_bucket{route="${route}",le="+Inf"}`);
  apiDurationBuckets.set(`audit_api_duration_sum{route="${route}"}`, (apiDurationBuckets.get(`audit_api_duration_sum{route="${route}"}`) ?? 0) + durationMs);
  apiDurationBuckets.set(`audit_api_duration_count{route="${route}"}`, (apiDurationBuckets.get(`audit_api_duration_count{route="${route}"}`) ?? 0) + 1);
}

function incrementRumCounter(key: string, by: number = 1): void {
  rumCounters.set(key, (rumCounters.get(key) ?? 0) + by);
}

export function observeApiRequest(route: string, status: number, durationMs: number): void {
  incrementCounter(`audit_api_requests_total{route="${route}",status="${status}"}`);
  observeLatency(route, durationMs);
}

export function isValidRumWebVitalValue(metric: string, value: number): boolean {
  if (!RUM_WEB_VITALS.has(metric) || !Number.isFinite(value) || value < 0) return false;
  return metric === "CLS" ? value <= 10 : value <= 120000;
}

export function observeRumWebVital(metric: string, valueMs: number): void {
  if (!isValidRumWebVitalValue(metric, valueMs)) {
    return;
  }

  incrementRumCounter(`audit_rum_web_vital_total{metric="${metric}"}`);
  const buckets = metric === "CLS" ? CLS_BUCKETS : RUM_BUCKETS_MS;
  for (const bucket of buckets) {
    if (valueMs <= bucket) {
      incrementRumCounter(`audit_rum_web_vital_bucket{metric="${metric}",le="${bucket}"}`);
    }
  }
  incrementRumCounter(`audit_rum_web_vital_bucket{metric="${metric}",le="+Inf"}`);

  rumDurationBuckets.set(
    `audit_rum_web_vital_sum{metric="${metric}"}`,
    (rumDurationBuckets.get(`audit_rum_web_vital_sum{metric="${metric}"}`) ?? 0) + valueMs,
  );
  rumDurationBuckets.set(
    `audit_rum_web_vital_count{metric="${metric}"}`,
    (rumDurationBuckets.get(`audit_rum_web_vital_count{metric="${metric}"}`) ?? 0) + 1,
  );
}

export function observeRumError(type: string): void {
  if (!RUM_ERROR_TYPES.has(type)) {
    return;
  }
  incrementRumCounter(`audit_rum_js_error_total{type="${type}"}`);
}

export function renderPrometheusMetrics(): string {
  const lines: string[] = [];

  lines.push("# HELP audit_api_requests_total Total API requests by route and status");
  lines.push("# TYPE audit_api_requests_total counter");
  for (const [k, v] of apiCounters.entries()) {
    if (k.startsWith("audit_api_requests_total")) {
      lines.push(`${k} ${v}`);
    }
  }

  lines.push("");
  lines.push("# HELP audit_api_duration_bucket API duration histogram buckets in milliseconds");
  lines.push("# TYPE audit_api_duration_bucket counter");
  for (const [k, v] of apiCounters.entries()) {
    if (k.startsWith("audit_api_duration_bucket")) {
      lines.push(`${k} ${v}`);
    }
  }

  lines.push("");
  lines.push("# HELP audit_api_duration_sum Total API duration in milliseconds");
  lines.push("# TYPE audit_api_duration_sum counter");
  for (const [k, v] of apiDurationBuckets.entries()) {
    if (k.startsWith("audit_api_duration_sum")) {
      lines.push(`${k} ${v}`);
    }
  }

  lines.push("");
  lines.push("# HELP audit_api_duration_count API call count for latency histogram");
  lines.push("# TYPE audit_api_duration_count counter");
  for (const [k, v] of apiDurationBuckets.entries()) {
    if (k.startsWith("audit_api_duration_count")) {
      lines.push(`${k} ${v}`);
    }
  }

  lines.push("");
  lines.push("# HELP audit_rum_web_vital_total Total browser web-vital samples");
  lines.push("# TYPE audit_rum_web_vital_total counter");
  for (const [k, v] of rumCounters.entries()) {
    if (k.startsWith("audit_rum_web_vital_total")) {
      lines.push(`${k} ${v}`);
    }
  }

  lines.push("");
  lines.push("# HELP audit_rum_web_vital_bucket Browser web-vital histogram buckets in native metric units");
  lines.push("# TYPE audit_rum_web_vital_bucket counter");
  for (const [k, v] of rumCounters.entries()) {
    if (k.startsWith("audit_rum_web_vital_bucket")) {
      lines.push(`${k} ${v}`);
    }
  }

  lines.push("");
  lines.push("# HELP audit_rum_web_vital_sum Total browser web-vital values in native units");
  lines.push("# TYPE audit_rum_web_vital_sum counter");
  for (const [k, v] of rumDurationBuckets.entries()) {
    if (k.startsWith("audit_rum_web_vital_sum")) {
      lines.push(`${k} ${v}`);
    }
  }

  lines.push("");
  lines.push("# HELP audit_rum_web_vital_count Browser web-vital sample count");
  lines.push("# TYPE audit_rum_web_vital_count counter");
  for (const [k, v] of rumDurationBuckets.entries()) {
    if (k.startsWith("audit_rum_web_vital_count")) {
      lines.push(`${k} ${v}`);
    }
  }

  lines.push("");
  lines.push("# HELP audit_rum_js_error_total Total browser JS errors by type");
  lines.push("# TYPE audit_rum_js_error_total counter");
  for (const [k, v] of rumCounters.entries()) {
    if (k.startsWith("audit_rum_js_error_total")) {
      lines.push(`${k} ${v}`);
    }
  }

  return `${lines.join("\n")}\n`;
}
