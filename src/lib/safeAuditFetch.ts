import dns from "node:dns/promises";
import http, { type IncomingMessage, type RequestOptions } from "node:http";
import https from "node:https";
import net from "node:net";
import type { Readable } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import { normalizeAuditTargetUrl, resolvePublicAuditHost, type AuditDnsRecord } from "./normalizeAuditTargetUrl";

const DEFAULT_MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const ALLOWED_CONTENT_TYPES = ["text/html", "application/xhtml+xml"];
const PRESERVED_RESPONSE_ERRORS = new Set([
  "AUDIT_RESPONSE_TOO_LARGE",
  "AUDIT_UNSUPPORTED_CONTENT_ENCODING",
  "AUDIT_REQUEST_ABORTED",
  "AUDIT_REQUEST_TIMEOUT"
]);

type AuditFetchOptions = {
  maxResponseBytes?: number;
  maxRedirects?: number;
  requestTimeoutMs?: number;
  dnsLookup?: (host: string) => Promise<AuditDnsRecord[]>;
  acceptedContentTypes?: string[];
};

export type AuditHtmlResponse = {
  finalUrl: string;
  status: number;
  headers: Record<string, string>;
  html: string;
  ttfbMs: number;
  responseMs: number;
};

export type AuditResourceResponse = Omit<AuditHtmlResponse, "html"> & { body: string };

function positiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || value === undefined || value <= 0) return fallback;
  return Math.floor(value);
}

function nonNegativeInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || value === undefined || value < 0) return fallback;
  return Math.floor(value);
}

function responseHeaders(response: IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(response.headers)) {
    if (Array.isArray(value)) headers[name] = value.join(", ");
    else if (value !== undefined) headers[name] = String(value);
  }
  return headers;
}

function assertAcceptedContentType(response: IncomingMessage, acceptedContentTypes: string[]): void {
  const raw = String(response.headers["content-type"] ?? "").toLowerCase();
  if (!raw) return;
  const mediaType = raw.split(";", 1)[0]?.trim();
  const accepted = acceptedContentTypes.some((type) => mediaType === type.toLowerCase().split(";", 1)[0]?.trim());
  if (!accepted) throw new Error("AUDIT_UNSUPPORTED_CONTENT_TYPE");
}

function decodedStream(response: IncomingMessage): Readable {
  const encoding = String(response.headers["content-encoding"] ?? "identity").trim().toLowerCase();
  if (!encoding || encoding === "identity") return response;
  if (encoding === "gzip" || encoding === "x-gzip") return response.pipe(createGunzip());
  if (encoding === "deflate") return response.pipe(createInflate());
  if (encoding === "br") return response.pipe(createBrotliDecompress());
  throw new Error("AUDIT_UNSUPPORTED_CONTENT_ENCODING");
}

function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error ? signal.reason : new Error("AUDIT_REQUEST_ABORTED");
}

function withoutIpv6Brackets(hostname: string): string {
  if (hostname.startsWith("[") && hostname.endsWith("]")) return hostname.slice(1, -1);
  return hostname;
}

async function readBoundedBody(response: IncomingMessage, maxBytes: number, signal: AbortSignal): Promise<string> {
  const advertisedLength = Number(response.headers["content-length"] ?? "0");
  const contentEncoding = String(response.headers["content-encoding"] ?? "identity").trim().toLowerCase();
  if ((!contentEncoding || contentEncoding === "identity") && Number.isFinite(advertisedLength) && advertisedLength > maxBytes) {
    response.destroy();
    throw new Error("AUDIT_RESPONSE_TOO_LARGE");
  }

  const chunks: Buffer[] = [];
  let total = 0;

  try {
    const stream = decodedStream(response);
    for await (const chunk of stream) {
      if (signal.aborted) throw abortError(signal);
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.byteLength;
      if (total > maxBytes) throw new Error("AUDIT_RESPONSE_TOO_LARGE");
      chunks.push(buffer);
    }
    if (signal.aborted) throw abortError(signal);
  } catch (error) {
    response.destroy();
    if (signal.aborted) throw abortError(signal);
    if (error instanceof Error && PRESERVED_RESPONSE_ERRORS.has(error.message)) throw error;
    throw new Error("AUDIT_RESPONSE_READ_FAILED", { cause: error });
  }

  return Buffer.concat(chunks, total).toString("utf8");
}

function selectAddress(records: AuditDnsRecord[]): AuditDnsRecord {
  const ipv4 = records.find((record) => record.family === 4);
  return ipv4 ?? records[0];
}

function performPinnedRequest(
  target: URL,
  address: AuditDnsRecord,
  signal: AbortSignal,
  timeoutMs: number,
  acceptedContentTypes: string[]
): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const isHttps = target.protocol === "https:";
    const requestImpl = isHttps ? https.request : http.request;
    const tlsHostname = withoutIpv6Brackets(target.hostname);
    const options: RequestOptions = {
      protocol: target.protocol,
      hostname: address.address,
      family: address.family,
      port: target.port ? Number(target.port) : isHttps ? 443 : 80,
      method: "GET",
      path: `${target.pathname}${target.search}`,
      headers: {
        Accept: acceptedContentTypes.join(", "),
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "close",
        Host: target.host,
        "User-Agent": "ASDEV-AuditBot/1.0"
      },
      ...(isHttps && !net.isIP(tlsHostname) ? { servername: tlsHostname } : {})
    };

    let settled = false;
    const request = requestImpl(options, (response) => {
      if (settled) {
        response.destroy();
        return;
      }
      settled = true;
      signal.removeEventListener("abort", onAbort);
      resolve(response);
    });

    const onAbort = () => {
      request.destroy(abortError(signal));
    };

    const finishReject = (error: unknown) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      reject(error);
    };

    request.setTimeout(timeoutMs, () => request.destroy(new Error("AUDIT_REQUEST_TIMEOUT")));
    request.once("error", finishReject);
    signal.addEventListener("abort", onAbort, { once: true });

    if (signal.aborted) {
      onAbort();
      return;
    }

    request.end();
  });
}

export async function fetchAuditResource(
  inputUrl: string,
  signal: AbortSignal,
  options: AuditFetchOptions = {}
): Promise<AuditResourceResponse> {
  const startedAt = Date.now();
  const maxBytes = positiveInteger(options.maxResponseBytes, DEFAULT_MAX_RESPONSE_BYTES);
  const maxRedirects = nonNegativeInteger(options.maxRedirects, DEFAULT_MAX_REDIRECTS);
  const timeoutMs = positiveInteger(options.requestTimeoutMs, DEFAULT_REQUEST_TIMEOUT_MS);
  const lookup = options.dnsLookup ?? ((host: string) => dns.lookup(host, { all: true }));
  const acceptedContentTypes = options.acceptedContentTypes ?? ALLOWED_CONTENT_TYPES;

  let currentUrl = inputUrl;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    if (signal.aborted) throw abortError(signal);

    const normalized = await normalizeAuditTargetUrl(currentUrl, { verifyDnsPublicIp: false });
    const records = await resolvePublicAuditHost(normalized.host, lookup);
    const address = selectAddress(records);
    const target = new URL(normalized.normalizedUrl);
    const response = await performPinnedRequest(target, address, signal, timeoutMs, acceptedContentTypes);
    const headerArrivalMs = Date.now() - startedAt;
    const abortResponse = () => response.destroy();
    signal.addEventListener("abort", abortResponse, { once: true });

    try {
      if (signal.aborted) throw abortError(signal);
      const status = response.statusCode ?? 0;

      if (REDIRECT_STATUSES.has(status) && response.headers.location) {
        response.destroy();
        if (redirectCount >= maxRedirects) throw new Error("AUDIT_TOO_MANY_REDIRECTS");
        currentUrl = new URL(response.headers.location, target).toString();
        continue;
      }

      if (status >= 200 && status < 300) assertAcceptedContentType(response, acceptedContentTypes);
      const body = await readBoundedBody(response, maxBytes, signal);

      return {
        finalUrl: target.toString(),
        status,
        headers: responseHeaders(response),
        body,
        ttfbMs: headerArrivalMs,
        responseMs: Date.now() - startedAt
      };
    } catch (error) {
      response.destroy();
      throw error;
    } finally {
      signal.removeEventListener("abort", abortResponse);
    }
  }

  throw new Error("AUDIT_TOO_MANY_REDIRECTS");
}

export async function fetchAuditHtml(
  inputUrl: string,
  signal: AbortSignal,
  options: AuditFetchOptions = {}
): Promise<AuditHtmlResponse> {
  const response = await fetchAuditResource(inputUrl, signal, {
    ...options,
    acceptedContentTypes: ALLOWED_CONTENT_TYPES,
  });
  const { body, ...metadata } = response;
  return { ...metadata, html: body };
}
