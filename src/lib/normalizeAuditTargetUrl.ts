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
  [ip4ToInt("192.0.2.0"), ip4ToInt("192.0.2.255")],
  [ip4ToInt("192.168.0.0"), ip4ToInt("192.168.255.255")],
  [ip4ToInt("198.18.0.0"), ip4ToInt("198.19.255.255")],
  [ip4ToInt("198.51.100.0"), ip4ToInt("198.51.100.255")],
  [ip4ToInt("203.0.113.0"), ip4ToInt("203.0.113.255")],
  [ip4ToInt("224.0.0.0"), ip4ToInt("255.255.255.255")]
];

const IPV6_SPECIAL_RANGES: Array<[string, number]> = [
  ["::", 96],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 32],
  ["2001:2::", 48],
  ["2001:10::", 28],
  ["2001:20::", 28],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
  ["fc00::", 7],
  ["fe80::", 10],
  ["fec0::", 10],
  ["ff00::", 8]
];

export type AuditDnsRecord = { address: string; family: number };

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
  dnsLookup?: (host: string) => Promise<AuditDnsRecord[]>;
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

function localFixtureAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.AUDIT_ALLOW_LOCAL_FIXTURE === "true";
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

function parseIpv6Section(section: string): number[] {
  if (!section) return [];
  const parts = section.split(":");
  const output: number[] = [];

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (part.includes(".")) {
      if (index !== parts.length - 1 || !net.isIPv4(part)) return [Number.NaN];
      const ipv4 = ip4ToInt(part);
      output.push((ipv4 >>> 16) & 0xffff, ipv4 & 0xffff);
      continue;
    }

    if (!/^[0-9a-f]{1,4}$/i.test(part)) return [Number.NaN];
    output.push(Number.parseInt(part, 16));
  }

  return output;
}

function parseIpv6Parts(ip: string): number[] | null {
  const value = normalizeIpHost(ip).toLowerCase().split("%")[0];
  if (!net.isIPv6(value)) return null;

  const sections = value.split("::");
  if (sections.length > 2) return null;

  const left = parseIpv6Section(sections[0]);
  const right = parseIpv6Section(sections[1] ?? "");
  if (left.some((part) => !Number.isInteger(part) || part < 0 || part > 0xffff)) return null;
  if (right.some((part) => !Number.isInteger(part) || part < 0 || part > 0xffff)) return null;

  if (sections.length === 1) return left.length === 8 ? left : null;
  const missing = 8 - left.length - right.length;
  if (missing < 1) return null;
  return [...left, ...Array.from({ length: missing }, () => 0), ...right];
}

function ipv6MatchesPrefix(address: number[], prefix: number[], prefixLength: number): boolean {
  const wholeParts = Math.floor(prefixLength / 16);
  const remainingBits = prefixLength % 16;

  for (let index = 0; index < wholeParts; index += 1) {
    if (address[index] !== prefix[index]) return false;
  }

  if (remainingBits === 0) return true;
  const mask = (0xffff << (16 - remainingBits)) & 0xffff;
  return (address[wholeParts] & mask) === (prefix[wholeParts] & mask);
}

function isPrivateOrReservedIPv6(ip: string): boolean {
  const address = parseIpv6Parts(ip);
  if (!address) return false;

  return IPV6_SPECIAL_RANGES.some(([prefixText, prefixLength]) => {
    const prefix = parseIpv6Parts(prefixText);
    return prefix ? ipv6MatchesPrefix(address, prefix, prefixLength) : false;
  });
}

export function assertPublicAuditAddress(host: string): void {
  if (localFixtureAllowed()) return;

  const normalizedHost = normalizeIpHost(host);
  if (isBlockedHostname(normalizedHost)) throw new Error("SSRF_BLOCKED_HOSTNAME");
  if (net.isIPv4(normalizedHost) && isPrivateOrReservedIPv4(normalizedHost)) {
    throw new Error("SSRF_BLOCKED_PRIVATE_IP");
  }
  if (net.isIPv6(normalizedHost) && isPrivateOrReservedIPv6(normalizedHost)) {
    throw new Error("SSRF_BLOCKED_PRIVATE_IP");
  }
}

function validateHostnameStructure(hostname: string): void {
  const normalized = normalizeIpHost(hostname);
  if (net.isIP(normalized)) return;

  const parts = normalized.split(".");
  if (parts.length < 2) throw new Error("INVALID_HOSTNAME_STRUCTURE");

  const hostnameRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
  if (!hostnameRegex.test(normalized)) throw new Error("INVALID_HOSTNAME_FORMAT");
}

function extractFirstFromSrcset(raw: string): string {
  return raw.split(",")[0]?.trim().split(/\s+/)[0] ?? "";
}

function assertResolvedRecordIsPublic(record: AuditDnsRecord): void {
  if (localFixtureAllowed()) return;

  if (record.family === 4 && net.isIPv4(record.address) && !isPrivateOrReservedIPv4(record.address)) return;
  if (record.family === 6 && net.isIPv6(record.address) && !isPrivateOrReservedIPv6(record.address)) return;
  if ((record.family === 4 && net.isIPv4(record.address)) || (record.family === 6 && net.isIPv6(record.address))) {
    throw new Error("SSRF_BLOCKED_DNS_PRIVATE_IP");
  }
  throw new Error("DNS_LOOKUP_INVALID_RECORD");
}

export async function resolvePublicAuditHost(
  host: string,
  lookup: (host: string) => Promise<AuditDnsRecord[]> = (value) => dns.lookup(value, { all: true })
): Promise<AuditDnsRecord[]> {
  const normalizedHost = normalizeIpHost(host);
  assertPublicAuditAddress(normalizedHost);

  const literalFamily = net.isIP(normalizedHost);
  if (literalFamily) {
    return [{ address: normalizedHost, family: literalFamily }];
  }

  const records = await lookup(normalizedHost);
  if (!records.length) throw new Error("DNS_LOOKUP_EMPTY");
  for (const record of records) assertResolvedRecordIsPublic(record);
  return records;
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
  if (hasAnyScheme && !/^https?:\/\//i.test(input)) throw new Error("INVALID_URL_PROTOCOL");

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

  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("INVALID_URL_PROTOCOL");

  if (url.username || url.password) {
    url.username = "";
    url.password = "";
    warnings.push("CREDENTIALS_STRIPPED");
  }

  const asciiHost = domainToASCII(url.hostname.toLowerCase());
  if (!asciiHost) throw new Error("INVALID_URL_HOST");
  url.hostname = asciiHost;

  assertPublicAuditAddress(url.hostname);
  validateHostnameStructure(url.hostname);

  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) {
    url.port = "";
  }

  if (url.hash) url.hash = "";

  url.pathname = url.pathname.replace(/\/{2,}/g, "/");
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) url.pathname = url.pathname.slice(0, -1);

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
    await resolvePublicAuditHost(url.hostname, opts.dnsLookup);
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
