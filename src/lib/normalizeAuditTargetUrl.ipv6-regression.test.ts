import { describe, expect, it } from "vitest";
import { normalizeAuditTargetUrl } from "./normalizeAuditTargetUrl";

describe("normalizeAuditTargetUrl IPv6 SSRF regressions", () => {
  it.each([
    "::ffff:127.0.0.1",
    "::ffff:169.254.169.254",
    "::127.0.0.1"
  ])("rejects private dotted IPv4 tails returned as IPv6: %s", async (address) => {
    await expect(
      normalizeAuditTargetUrl("https://example.com", {
        verifyDnsPublicIp: true,
        dnsLookup: async () => [{ address, family: 6 }]
      })
    ).rejects.toThrow("SSRF_BLOCKED_DNS_PRIVATE_IP");
  });
});
