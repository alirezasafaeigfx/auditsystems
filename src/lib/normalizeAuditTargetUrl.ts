import dns from "node:dns/promises";
import net from "node:net";
import { domainToASCII } from "node:url";

const TRACKING_PARAMS = new Set(["gclid", "fbclid", "yclid", "igshid", "mc_cid", "mc_eid"]);
const BLOCKED_SUFFIXES = [".local", ".internal", ".lan", ".home"];

const IPV4_CIDR_RANGES: Array<[number, number]> = [
  [ip4ToInt("0.0.0.0"), ip4ToInt("0.255.255.255")],
  [ip4ToInt("10.0.0.0"), ip4ToInt("10.255.255.255")],
  [ip4ToInt("100.64.0.0"), ip4ToInt("100.127.255.255")],
  [ip4ToInt("127.0.0.0"), ip4ToInt("127.255.255.255")],
  [ip4ToInt("169.254.0.0"), ip4ToInt("169.254.255.255")],
  [ip4ToInt("172.16.0.0"), ip4ToInt("172.31.255.255")],
  [ip4ToInt("192.0.0.0"), ip4ToInt("192.0.0.255")],
  [ip4ToInt("192.168.0.0"), ip4ToInt("192.168.255.255")],
  [ip4ToInt("198.18.0.0"), ip4ToInt("198.19.255.255")],
  [ip4ToInt("224.0.0.0"), ip4ToInt("255.255.255.255")]
];

export type NormalizeAuditUrlResult = {
  input: string;
  normalizedUrl: string;
  origin: string;
  host: string;
  protocol: "http:" | "https:";
  warnings: string[];
};

export type NormalizeAuditUrlOptions = {
  defaultProtocol?: "https:" | "http:";
  maxLength?: number;
  verifyDnsPublicIp?: boolean;
  dnsLookup?: (host: string) => Promise<Array<{ address: string; family: number }>>;
};

function ip4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function stripControlChars(raw: string): string {
  return raw.replace(/[\u0000-\u001F\u007F]/g, "");
}

function normalizeIpHost(host: string): string {
  if (host.startsWith("[") && host.endsWith("]")) {
    return host.slice(1, -1);
  }
  return host;
}

function isBlockedHostname(host: string): boolean {
  const lowered = host.toLowerCase();
  if (lowered === "localhost") return true;
  return BLOCKED_SUFFIXES.some((suffix) => lowered.endsWith(suffix));
}

function isPrivateOrReservedIPv4(ip: string): boolean {
  if (!net.isIPv4(ip)) return false;
  const int = ip4ToInt(ip);
  return IPV4_CIDR_RANGES.some(([start, end]) => int >= start && int <= end);
}

function isPrivateOrReservedIPv6(ip: string): boolean {
  if (!net.isIPv6(ip)) return false;
  const x = ip.toLowerCase();
  return x === "::1" || x.startsWith("fe8") || x.startsWith("fe9") || x.startsWith("fea") || x.startsWith("feb") || x.startsWith("fc") || x.startsWith("fd");
}

function assertPublicAddress(host: string): void {
  if (process.env.NODE_ENV !== "production" && process.env.AUDIT_ALLOW_LOCAL_FIXTURE === "true") {
    return;
  }

  const normalizedHost = normalizeIpHost(host);

  if (isBlockedHostname(normalizedHost)) {
    throw new Error("SSRF_BLOCKED_HOSTNAME");
  }

  if (net.isIPv4(normalizedHost) && isPrivateOrReservedIPv4(normalizedHost)) {
    throw new Error("SSRF_BLOCKED_PRIVATE_IP");
  }

  if (net.isIPv6(normalizedHost) && isPrivateOrReservedIPv6(normalizedHost)) {
    throw new Error("SSRF_BLOCKED_PRIVATE_IP");
  }
}

function validateHostnameStructure(hostname: string): void {
  if (net.isIP(hostname)) return; // Skip structure validation for IP addresses

  const parts = hostname.split(".");
  if (parts.length < 2) {
    throw new Error("INVALID_HOSTNAME_STRUCTURE");
  }

  // Basic hostname validation: each part should be non-empty and valid
  const hostnameRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
  if (!hostnameRegex.test(hostname)) {
    throw new Error("INVALID_HOSTNAME_FORMAT");
  }
}

function extractFirstFromSrcset(raw: string): string {
  return raw.split(",")[0]?.trim().split(/\s+/)[0] ?? "";
}

async function assertPublicDns(
  host: string,
  lookup: (host: string) => Promise<Array<{ address: string; family: number }>>
): Promise<void> {
  const records = await lookup(host);
  for (const rec of records) {
    if ((rec.family === 4 && isPrivateOrReservedIPv4(rec.address)) || (rec.family === 6 && isPrivateOrReservedIPv6(rec.address))) {
      throw new Error("SSRF_BLOCKED_DNS_PRIVATE_IP");
    }
  }
}

export async function normalizeAuditTargetUrl(
  inputRaw: string,
  opts: NormalizeAuditUrlOptions = {}
): Promise<NormalizeAuditUrlResult> {
  const warnings: string[] = [];
  const defaultProtocol = opts.defaultProtocol ?? "https:";
  const maxLength = opts.maxLength ?? 2048;

  let input = stripControlChars(String(inputRaw ?? "")).trim();
  if (!input) throw new Error("INVALID_URL_EMPTY");

  const hasAnyScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(input);
  if (hasAnyScheme && !/^https?:\/\//i.test(input)) {
    throw new Error("INVALID_URL_PROTOCOL");
  }

  if (!/^https?:\/\//i.test(input)) {
    input = `${defaultProtocol}//${input}`;
    warnings.push("SCHEME_ADDED_DEFAULT");
  }

  if (input.length > maxLength) throw new Error("INVALID_URL_TOO_LONG");

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("INVALID_URL_PARSE");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("INVALID_URL_PROTOCOL");
  }

  if (url.username || url.password) {
    url.username = "";
    url.password = "";
    warnings.push("CREDENTIALS_STRIPPED");
  }

  const asciiHost = domainToASCII(url.hostname.toLowerCase());
  if (!asciiHost) throw new Error("INVALID_URL_HOST");
  url.hostname = asciiHost;

  assertPublicAddress(url.hostname);
  validateHostnameStructure(url.hostname);

  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) {
    url.port = "";
  }

  if (url.hash) url.hash = "";

  url.pathname = url.pathname.replace(/\/{2,}/g, "/");
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  const normalizedQuery: Array<[string, string]> = [];
  for (const [keyRaw, valueRaw] of url.searchParams.entries()) {
    const key = keyRaw.trim();
    const value = valueRaw.trim();
    const lowered = key.toLowerCase();

    if (!key || !value) continue;
    if (lowered.startsWith("utm_")) continue;
    if (TRACKING_PARAMS.has(lowered)) continue;
    normalizedQuery.push([key, value]);
  }

  normalizedQuery.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  url.search = normalizedQuery.length > 0 ? `?${new URLSearchParams(normalizedQuery).toString()}` : "";

  if (opts.verifyDnsPublicIp) {
    await assertPublicDns(url.hostname, opts.dnsLookup ?? ((host) => dns.lookup(host, { all: true })));
  }

  const normalizedUrl = url.toString();
  if (normalizedUrl.length > maxLength) throw new Error("INVALID_URL_TOO_LONG_AFTER_NORMALIZE");

  return {
    input: inputRaw,
    normalizedUrl,
    origin: url.origin,
    host: url.hostname,
    protocol: url.protocol as "http:" | "https:",
    warnings
  };
}

export function firstSrcsetCandidate(srcset: string): string {
  return extractFirstFromSrcset(srcset);
}
