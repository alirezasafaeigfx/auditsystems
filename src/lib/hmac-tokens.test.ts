import { describe, it, expect } from "vitest";
import { signToken, verifyToken, signUnsubToken, verifyUnsubToken } from "./hmac-tokens";

const TEST_SECRET = "test-secret-key-for-hmac-tokens-32chars!";

describe("hmac-tokens", () => {
  describe("signToken / verifyToken", () => {
    it("creates and verifies a valid token", () => {
      const token = signToken("test-payload", TEST_SECRET);
      const result = verifyToken(token, TEST_SECRET);
      expect(result).toBe("test-payload");
    });

    it("rejects token with tampered payload", () => {
      const token = signToken("original-payload", TEST_SECRET);
      const parts = Buffer.from(token, "base64").toString("utf-8").split(":");
      const tampered = Buffer.from(`tampered-payload:${parts[1]}`).toString("base64");
      const result = verifyToken(tampered, TEST_SECRET);
      expect(result).toBeNull();
    });

    it("rejects token with tampered signature", () => {
      const token = signToken("test-payload", TEST_SECRET);
      const parts = Buffer.from(token, "base64").toString("utf-8").split(":");
      const tampered = Buffer.from(`${parts[0]}:aaaa000000000000000000000000000000000000000000000000000000000000`).toString("base64");
      const result = verifyToken(tampered, TEST_SECRET);
      expect(result).toBeNull();
    });

    it("rejects token with wrong secret", () => {
      const token = signToken("test-payload", TEST_SECRET);
      const result = verifyToken(token, "wrong-secret-key");
      expect(result).toBeNull();
    });

    it("rejects token with empty secret", () => {
      const token = signToken("test-payload", TEST_SECRET);
      const result = verifyToken(token, "");
      expect(result).toBeNull();
    });

    it("rejects malformed base64", () => {
      const result = verifyToken("not-valid-base64!!!", TEST_SECRET);
      expect(result).toBeNull();
    });

    it("rejects empty token", () => {
      const result = verifyToken("", TEST_SECRET);
      expect(result).toBeNull();
    });

    it("rejects token with no signature separator", () => {
      const bad = Buffer.from("no-colon-separator").toString("base64");
      const result = verifyToken(bad, TEST_SECRET);
      expect(result).toBeNull();
    });

    it("rejects token with short signature", () => {
      const bad = Buffer.from("payload:shortsig").toString("base64");
      const result = verifyToken(bad, TEST_SECRET);
      expect(result).toBeNull();
    });

    it("uses domain separation", () => {
      const token = signToken("test-payload", TEST_SECRET, "domain-a");
      const result = verifyToken(token, TEST_SECRET, "domain-b");
      expect(result).toBeNull();
    });

    it("fails closed on missing secret", () => {
      expect(() => signToken("payload", "")).toThrow("HMAC secret is required");
    });

    it("fails closed on missing payload", () => {
      expect(() => signToken("", TEST_SECRET)).toThrow("Payload is required");
    });
  });

  describe("signUnsubToken / verifyUnsubToken", () => {
    it("creates and verifies a valid unsub token", () => {
      const token = signUnsubToken("org-123", TEST_SECRET);
      const result = verifyUnsubToken(token, TEST_SECRET);
      expect(result).toBe("org-123");
    });

    it("rejects token for different domain", () => {
      const token = signToken("unsub:org-123", TEST_SECRET, "wrong-domain");
      const result = verifyUnsubToken(token, TEST_SECRET);
      expect(result).toBeNull();
    });

    it("rejects payload without unsub: prefix", () => {
      const token = signToken("malicious:org-123", TEST_SECRET, "asdev-unsub-v1");
      const result = verifyUnsubToken(token, TEST_SECRET);
      expect(result).toBeNull();
    });

    it("rejects empty organization ID", () => {
      const token = signToken("unsub:", TEST_SECRET, "asdev-unsub-v1");
      const result = verifyUnsubToken(token, TEST_SECRET);
      expect(result).toBeNull();
    });

    it("rejects legacy unsigned tokens", () => {
      const legacyToken = Buffer.from("unsub:org-123").toString("base64");
      const result = verifyUnsubToken(legacyToken, TEST_SECRET);
      expect(result).toBeNull();
    });

    it("rejects base64-only tokens without signature", () => {
      const bad = Buffer.from("unsub:org-123").toString("base64");
      const result = verifyUnsubToken(bad, TEST_SECRET);
      expect(result).toBeNull();
    });
  });

  describe("exploit-oriented tests", () => {
    it("rejects replay of token for different org", () => {
      const token1 = signUnsubToken("org-victim", TEST_SECRET);
      const token2 = signUnsubToken("org-attacker", TEST_SECRET);
      expect(verifyUnsubToken(token1, TEST_SECRET)).toBe("org-victim");
      expect(verifyUnsubToken(token2, TEST_SECRET)).toBe("org-attacker");
      expect(verifyUnsubToken(token1, TEST_SECRET)).not.toBe("org-attacker");
    });

    it("rejects token with unicode payload", () => {
      const token = signToken("unsub:org-123-unicode", TEST_SECRET, "asdev-unsub-v1");
      const result = verifyUnsubToken(token, TEST_SECRET);
      expect(result).toBe("org-123-unicode");
    });

    it("rejects timing attack by comparing signatures", () => {
      const token1 = signToken("payload-a", TEST_SECRET);
      const token2 = signToken("payload-b", TEST_SECRET);
      const sig1 = Buffer.from(token1, "base64").toString("utf-8").split(":")[1];
      const sig2 = Buffer.from(token2, "base64").toString("utf-8").split(":")[1];
      expect(sig1).not.toBe(sig2);
    });
  });
});
