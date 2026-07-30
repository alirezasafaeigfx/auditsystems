import { describe, expect, it } from "vitest";
import { normalizeAuditTargetUrl } from "./normalizeAuditTargetUrl";

describe("normalizeAuditTargetUrl", () => {
  it("adds default https scheme", async () => {
    const out = await normalizeAuditTargetUrl("example.com");
    expect(out.normalizedUrl).toBe("https://example.com/");
    expect(out.warnings).toContain("SCHEME_ADDED_DEFAULT");
  });

  it("strips credentials", async () => {
    const out = await normalizeAuditTargetUrl("https://user:pass@example.com/path");
    expect(out.normalizedUrl).toBe("https://example.com/path");
    expect(out.warnings).toContain("CREDENTIALS_STRIPPED");
  });

  it("drops hash and tracking query params and sorts query", async () => {
    const out = await normalizeAuditTargetUrl("https://example.com/?utm_source=x&b=2&gclid=123&a=1#frag");
    expect(out.normalizedUrl).toBe("https://example.com/?a=1&b=2");
  });

  it("removes default ports", async () => {
    const out = await normalizeAuditTargetUrl("https://example.com:443/a");
    expect(out.normalizedUrl).toBe("https://example.com/a");
  });

  it("normalizes duplicate slashes and trailing slash", async () => {
    const out = await normalizeAuditTargetUrl("https://example.com//a//b/");
    expect(out.normalizedUrl).toBe("https://example.com/a/b");
  });

  it("converts IDN host to ASCII", async () => {
    const out = await normalizeAuditTargetUrl("https://bücher.de");
    expect(out.host).toBe("xn--bcher-kva.de");
  });

  it("blocks localhost", async () => {
    await expect(normalizeAuditTargetUrl("http://localhost:8080")).rejects.toThrow("SSRF_BLOCKED_HOSTNAME");
  });

  it("blocks .local and .internal domains", async () => {
    await expect(normalizeAuditTargetUrl("http://myapp.local")).rejects.toThrow("SSRF_BLOCKED_HOSTNAME");
    await expect(normalizeAuditTargetUrl("http://service.internal")).rejects.toThrow("SSRF_BLOCKED_HOSTNAME");
  });

  it("blocks private and documentation IPv4 ranges", async () => {
    await expect(normalizeAuditTargetUrl("http://10.10.0.1")).rejects.toThrow("SSRF_BLOCKED_PRIVATE_IP");
    await expect(normalizeAuditTargetUrl("http://192.168.1.20")).rejects.toThrow("SSRF_BLOCKED_PRIVATE_IP");
    await expect(normalizeAuditTargetUrl("http://192.0.2.10")).rejects.toThrow("SSRF_BLOCKED_PRIVATE_IP");
    await expect(normalizeAuditTargetUrl("http://198.51.100.10")).rejects.toThrow("SSRF_BLOCKED_PRIVATE_IP");
    await expect(normalizeAuditTargetUrl("http://203.0.113.10")).rejects.toThrow("SSRF_BLOCKED_PRIVATE_IP");
  });

  it("blocks loopback, unspecified, mapped, NAT64, documentation, ULA, and link-local IPv6", async () => {
    const blocked = [
      "http://[::1]",
      "http://[::]",
      "http://[::ffff:127.0.0.1]",
      "http://[::ffff:169.254.169.254]",
      "http://[64:ff9b::7f00:1]",
      "http://[2001:db8::1]",
      "http://[fc00::1]",
      "http://[fe80::1]"
    ];

    for (const url of blocked) {
      await expect(normalizeAuditTargetUrl(url)).rejects.toThrow("SSRF_BLOCKED_PRIVATE_IP");
    }
  });

  it("accepts a public IPv6 literal", async () => {
    const out = await normalizeAuditTargetUrl("https://[2606:4700:4700::1111]");
    expect(out.normalizedUrl).toBe("https://[2606:4700:4700::1111]/");
  });

  it("blocks protocol other than http/https", async () => {
    await expect(normalizeAuditTargetUrl("ftp://example.com")).rejects.toThrow("INVALID_URL_PROTOCOL");
  });

  it("strips control chars", async () => {
    const out = await normalizeAuditTargetUrl("\u0000\nhttps://example.com");
    expect(out.normalizedUrl).toBe("https://example.com/");
  });

  it("enforces max length", async () => {
    await expect(normalizeAuditTargetUrl(`https://example.com/${"a".repeat(3000)}`)).rejects.toThrow("INVALID_URL_TOO_LONG");
  });

  it("rejects malformed urls", async () => {
    await expect(normalizeAuditTargetUrl("https://exa mple.com")).rejects.toThrow("INVALID_URL_PARSE");
  });

  it("rejects dns lookup that resolves to private IPv4", async () => {
    await expect(
      normalizeAuditTargetUrl("https://example.com", {
        verifyDnsPublicIp: true,
        dnsLookup: async () => [{ address: "10.0.0.2", family: 4 }]
      })
    ).rejects.toThrow("SSRF_BLOCKED_DNS_PRIVATE_IP");
  });

  it("rejects dns lookup that resolves to mapped private IPv6", async () => {
    await expect(
      normalizeAuditTargetUrl("https://example.com", {
        verifyDnsPublicIp: true,
        dnsLookup: async () => [{ address: "::ffff:7f00:1", family: 6 }]
      })
    ).rejects.toThrow("SSRF_BLOCKED_DNS_PRIVATE_IP");
  });

  it("rejects malformed dns records", async () => {
    await expect(
      normalizeAuditTargetUrl("https://example.com", {
        verifyDnsPublicIp: true,
        dnsLookup: async () => [{ address: "not-an-ip", family: 4 }]
      })
    ).rejects.toThrow("DNS_LOOKUP_INVALID_RECORD");
  });

  it("accepts dns lookup with public records", async () => {
    const out = await normalizeAuditTargetUrl("https://example.com", {
      verifyDnsPublicIp: true,
      dnsLookup: async () => [{ address: "93.184.216.34", family: 4 }]
    });
    expect(out.normalizedUrl).toBe("https://example.com/");
  });

  it("keeps http scheme when explicitly provided", async () => {
    const out = await normalizeAuditTargetUrl("http://example.com/path");
    expect(out.protocol).toBe("http:");
  });

  it("handles international domain names with punycode", async () => {
    const out = await normalizeAuditTargetUrl("https://中国.cn");
    expect(out.host).toBe("xn--fiqs8s.cn");
  });

  it("strips multiple tracking parameters", async () => {
    const out = await normalizeAuditTargetUrl("https://example.com/?utm_source=google&utm_medium=cpc&fbclid=abc123&gclid=xyz789");
    expect(out.normalizedUrl).toBe("https://example.com/");
  });

  it("handles empty query parameters after stripping", async () => {
    const out = await normalizeAuditTargetUrl("https://example.com/?utm_source=test");
    expect(out.normalizedUrl).toBe("https://example.com/");
  });

  it("preserves legitimate query parameters", async () => {
    const out = await normalizeAuditTargetUrl("https://example.com/?page=1&sort=desc");
    expect(out.normalizedUrl).toBe("https://example.com/?page=1&sort=desc");
  });

  it("sorts query parameters alphabetically", async () => {
    const out = await normalizeAuditTargetUrl("https://example.com/?z=1&a=2&m=3");
    expect(out.normalizedUrl).toBe("https://example.com/?a=2&m=3&z=1");
  });

  it("handles URLs with fragments and tracking params", async () => {
    const out = await normalizeAuditTargetUrl("https://example.com/path#section?utm_source=test");
    expect(out.normalizedUrl).toBe("https://example.com/path");
    expect(out.warnings).not.toContain("SCHEME_ADDED_DEFAULT");
  });

  it("blocks internal network domains", async () => {
    await expect(normalizeAuditTargetUrl("http://app.home")).rejects.toThrow("SSRF_BLOCKED_HOSTNAME");
    await expect(normalizeAuditTargetUrl("http://server.lan")).rejects.toThrow("SSRF_BLOCKED_HOSTNAME");
  });

  it("handles username without password", async () => {
    const out = await normalizeAuditTargetUrl("https://user@example.com/path");
    expect(out.normalizedUrl).toBe("https://example.com/path");
    expect(out.warnings).toContain("CREDENTIALS_STRIPPED");
  });

  it("handles port normalization for non-standard ports", async () => {
    const out = await normalizeAuditTargetUrl("https://example.com:8443/path");
    expect(out.normalizedUrl).toBe("https://example.com:8443/path");
  });

  it("handles complex path normalization", async () => {
    const out = await normalizeAuditTargetUrl("https://example.com/a//b///c/");
    expect(out.normalizedUrl).toBe("https://example.com/a/b/c");
  });

  it("handles URL with only query parameters", async () => {
    const out = await normalizeAuditTargetUrl("https://example.com/?a=1&b=2");
    expect(out.normalizedUrl).toBe("https://example.com/?a=1&b=2");
  });

  it("handles URL with leading/trailing spaces in input", async () => {
    const out = await normalizeAuditTargetUrl("  https://example.com  ");
    expect(out.normalizedUrl).toBe("https://example.com/");
  });

  it("rejects URL with invalid characters in hostname", async () => {
    await expect(normalizeAuditTargetUrl("https://example$domain.com")).rejects.toThrow("INVALID_HOSTNAME_FORMAT");
  });
});
