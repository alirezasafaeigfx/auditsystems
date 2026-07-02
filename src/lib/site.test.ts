import { describe, it, expect } from "vitest";
import { getAppBaseUrl, toAbsoluteUrl } from "./site";

describe("site URL configuration", () => {
  describe("getAppBaseUrl", () => {
    it("returns production URL when APP_BASE_URL is not set", () => {
      const url = getAppBaseUrl();
      expect(url).toBe("https://audit.alirezasafaeisystems.ir");
      expect(url).not.toContain("localhost");
    });

    it("never returns localhost in any environment", () => {
      const url = getAppBaseUrl();
      expect(url).not.toContain("localhost");
      expect(url).not.toContain("127.0.0.1");
      expect(url).not.toContain("0.0.0.0");
    });

    it("returns https URL", () => {
      const url = getAppBaseUrl();
      expect(url).toMatch(/^https:\/\//);
    });
  });

  describe("toAbsoluteUrl", () => {
    it("generates absolute URLs with production domain", () => {
      const url = toAbsoluteUrl("/");
      expect(url).toBe("https://audit.alirezasafaeisystems.ir/");
      expect(url).not.toContain("localhost");
    });

    it("generates correct absolute URL for paths", () => {
      const url = toAbsoluteUrl("/audit");
      expect(url).toBe("https://audit.alirezasafaeisystems.ir/audit");
    });

    it("generates correct absolute URL for en paths", () => {
      const url = toAbsoluteUrl("/en");
      expect(url).toBe("https://audit.alirezasafaeisystems.ir/en");
    });

    it("generates correct absolute URL for nested en paths", () => {
      const url = toAbsoluteUrl("/en/guides");
      expect(url).toBe("https://audit.alirezasafaeisystems.ir/en/guides");
    });
  });
});
